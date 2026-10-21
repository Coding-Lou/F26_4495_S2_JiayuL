package com.jay.outdoor.plan.service;

import com.jay.outdoor.plan.client.TrailCatalogClient;
import com.jay.outdoor.plan.dto.CreatePlanRequest;
import com.jay.outdoor.plan.dto.PlanPage;
import com.jay.outdoor.plan.dto.PlanResponse;
import com.jay.outdoor.plan.entity.Plan;
import com.jay.outdoor.plan.exception.PlanNotFoundException;
import com.jay.outdoor.plan.exception.TrailNotFoundException;
import com.jay.outdoor.plan.repository.PlanRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Owner Plan operations. Every lookup is scoped to (owner subject, not deleted),
 * so a foreign, missing, or deleted Plan is the same 404 (spec section 9).
 *
 * <p>Not {@code @Transactional}: each step runs in its own TransactionTemplate
 * transaction, so a failed concurrent insert rolls back on its own and the
 * re-read runs in a fresh transaction (spec section 10).
 */
@Service
public class PlanService {

    private static final Logger log = LoggerFactory.getLogger(PlanService.class);

    private final PlanRepository planRepository;
    private final PlanFieldRules fieldRules;
    private final TrailCatalogClient trailCatalogClient;
    private final TransactionTemplate transaction;
    private final TransactionTemplate readOnlyTransaction;

    public PlanService(
            PlanRepository planRepository,
            PlanFieldRules fieldRules,
            TrailCatalogClient trailCatalogClient,
            PlatformTransactionManager transactionManager
    ) {
        this.planRepository = planRepository;
        this.fieldRules = fieldRules;
        this.trailCatalogClient = trailCatalogClient;
        this.transaction = new TransactionTemplate(transactionManager);
        this.readOnlyTransaction = new TransactionTemplate(transactionManager);
        this.readOnlyTransaction.setReadOnly(true);
    }

    /** Idempotent create (D8): 201 for a new Plan, 200 with the existing active one. */
    public CreatePlanResult create(String ownerSubject, CreatePlanRequest request) {
        UUID trailId = request.trailId();
        LocalDate tripDate = request.tripDate();

        // 1. The date rule; nothing else happens when it fails.
        fieldRules.validateTripDate(tripDate);

        // 2. An active Plan for this identity: returned unchanged, with no trail call.
        Optional<PlanResponse> existing = findActive(ownerSubject, trailId, tripDate);
        if (existing.isPresent()) {
            log.info("Create plan for trail {}: existing plan {} returned",
                    trailId, existing.get().id());
            return new CreatePlanResult(existing.get(), false);
        }

        // 3. Outside any transaction; fails closed (503) when trail-service cannot answer.
        if (!trailCatalogClient.trailExists(trailId)) {
            log.info("Create plan for trail {}: trail not found", trailId);
            throw new TrailNotFoundException();
        }

        // 4. Insert; the partial unique index is the real duplicate guard (D5).
        try {
            PlanResponse created = transaction.execute(status ->
                    PlanResponse.of(planRepository.saveAndFlush(
                            new Plan(ownerSubject, trailId, tripDate))));

            log.info("Create plan for trail {}: created plan {}", trailId, created.id());
            return new CreatePlanResult(created, true);
        } catch (DataIntegrityViolationException ex) {
            // 5. A concurrent create won. Its transaction has rolled back; re-read in a
            // new one. The exception message is not logged: it carries key values.
            PlanResponse winner = findActive(ownerSubject, trailId, tripDate)
                    .orElseThrow(() -> ex);

            log.info("Create plan for trail {}: concurrent create, existing plan {} returned",
                    trailId, winner.id());
            return new CreatePlanResult(winner, false);
        }
    }

    /** Both upcoming and past Plans; no trail-service call. */
    public PlanPage list(String ownerSubject, int page, int size) {
        var pageable = PlanPaging.of(page, size);

        return readOnlyTransaction.execute(status -> {
            Page<Plan> result =
                    planRepository.findByOwnerSubjectAndDeletedFalse(ownerSubject, pageable);
            List<PlanResponse> items = result.getContent().stream()
                    .map(PlanResponse::of)
                    .toList();
            return PlanPage.of(result, items);
        });
    }

    /** No trail-service call: a Plan on a later-deleted trail stays readable (spec section 11). */
    public PlanResponse get(String ownerSubject, UUID planId) {
        return readOnlyTransaction.execute(status -> PlanResponse.of(owned(ownerSubject, planId)));
    }

    /** Soft delete (spec section 12.5). */
    public void delete(String ownerSubject, UUID planId) {
        transaction.executeWithoutResult(status -> owned(ownerSubject, planId).markDeleted());

        log.info("Soft-deleted plan {}", planId);
    }

    private Optional<PlanResponse> findActive(String ownerSubject, UUID trailId, LocalDate tripDate) {
        return readOnlyTransaction.execute(status -> planRepository
                .findByOwnerSubjectAndTrailIdAndTripDateAndDeletedFalse(ownerSubject, trailId, tripDate)
                .map(PlanResponse::of));
    }

    private Plan owned(String ownerSubject, UUID planId) {
        return planRepository
                .findByIdAndOwnerSubjectAndDeletedFalse(planId, ownerSubject)
                .orElseThrow(PlanNotFoundException::new);
    }
}
