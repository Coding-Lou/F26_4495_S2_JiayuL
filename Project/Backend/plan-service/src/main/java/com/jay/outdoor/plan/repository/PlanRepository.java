package com.jay.outdoor.plan.repository;

import com.jay.outdoor.plan.entity.Plan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

/** Every query is scoped to the owner and to non-deleted rows in the query itself (spec section 9). */
public interface PlanRepository extends JpaRepository<Plan, UUID> {

    /** Owner lookup: missing, deleted, and foreign Plans are all absent. */
    Optional<Plan> findByIdAndOwnerSubjectAndDeletedFalse(UUID id, String ownerSubject);

    /** The caller's active Plan for one identity (D6), served by the partial unique index. */
    Optional<Plan> findByOwnerSubjectAndTrailIdAndTripDateAndDeletedFalse(
            String ownerSubject,
            UUID trailId,
            LocalDate tripDate
    );

    Page<Plan> findByOwnerSubjectAndDeletedFalse(String ownerSubject, Pageable pageable);
}
