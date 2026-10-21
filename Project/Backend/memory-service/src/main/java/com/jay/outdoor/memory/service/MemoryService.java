package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.client.TrailCatalogClient;
import com.jay.outdoor.memory.dto.CreateMemoryRequest;
import com.jay.outdoor.memory.dto.MemoryPage;
import com.jay.outdoor.memory.dto.OwnerMemoryDetail;
import com.jay.outdoor.memory.dto.OwnerMemorySummary;
import com.jay.outdoor.memory.dto.UpdateMemoryRequest;
import com.jay.outdoor.memory.entity.Memory;
import com.jay.outdoor.memory.entity.MemoryPhoto;
import com.jay.outdoor.memory.entity.MemoryVisibility;
import com.jay.outdoor.memory.exception.MemoryNotFoundException;
import com.jay.outdoor.memory.exception.TrailNotFoundException;
import com.jay.outdoor.memory.repository.MemoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Owner CRUD. Every lookup is scoped to (id, owner subject, not deleted), so a
 * foreign, missing, or deleted Memory is the same 404 (D14).
 */
@Service
public class MemoryService {

    private static final Logger log = LoggerFactory.getLogger(MemoryService.class);

    private final MemoryRepository memoryRepository;
    private final PhotoLookup photoLookup;
    private final MemoryPresenter presenter;
    private final MemoryFieldRules fieldRules;
    private final TrailCatalogClient trailCatalogClient;
    private final TransactionTemplate transaction;
    private final TransactionTemplate readOnlyTransaction;

    public MemoryService(
            MemoryRepository memoryRepository,
            PhotoLookup photoLookup,
            MemoryPresenter presenter,
            MemoryFieldRules fieldRules,
            TrailCatalogClient trailCatalogClient,
            PlatformTransactionManager transactionManager
    ) {
        this.memoryRepository = memoryRepository;
        this.photoLookup = photoLookup;
        this.presenter = presenter;
        this.fieldRules = fieldRules;
        this.trailCatalogClient = trailCatalogClient;
        this.transaction = new TransactionTemplate(transactionManager);
        this.readOnlyTransaction = new TransactionTemplate(transactionManager);
        this.readOnlyTransaction.setReadOnly(true);
    }

    /** Own Memories of both visibilities; no trail-service call. */
    public MemoryPage<OwnerMemorySummary> list(String ownerSubject, int page, int size) {
        var pageable = MemoryPaging.of(page, size);

        return readOnlyTransaction.execute(status -> {
            Page<Memory> result =
                    memoryRepository.findByOwnerSubjectAndDeletedFalse(ownerSubject, pageable);
            Map<UUID, List<MemoryPhoto>> photos = photoLookup.forMemories(result.getContent());

            List<OwnerMemorySummary> items = result.getContent().stream()
                    .map(memory -> presenter.ownerSummary(
                            memory, photos.getOrDefault(memory.getId(), List.of())))
                    .toList();

            return MemoryPage.of(result, items);
        });
    }

    public OwnerMemoryDetail create(String ownerSubject, CreateMemoryRequest request) {
        MemoryFieldRules.Fields fields =
                fieldRules.validate(request.tripDate(), request.title(), request.story());

        // Outside any transaction; fails closed (503) when trail-service cannot answer.
        if (!trailCatalogClient.trailExists(request.trailId())) {
            throw new TrailNotFoundException(HttpStatus.BAD_REQUEST);
        }

        Memory memory = new Memory(ownerSubject, request.trailId());
        memory.setTripDate(fields.tripDate());
        memory.setTitle(fields.title());
        memory.setStory(fields.story());
        memory.setVisibility(request.visibility() != null
                ? request.visibility()
                : MemoryVisibility.PRIVATE);

        Memory saved = transaction.execute(status -> memoryRepository.save(memory));

        log.info("Created memory {}", saved.getId());

        return presenter.ownerDetail(saved, List.of());
    }

    /** No trail-service call: a Memory on a later-deleted trail stays readable (section 15.3). */
    public OwnerMemoryDetail get(String ownerSubject, UUID memoryId) {
        return readOnlyTransaction.execute(status -> {
            Memory memory = owned(ownerSubject, memoryId);
            return presenter.ownerDetail(memory, photoLookup.forMemory(memoryId));
        });
    }

    public OwnerMemoryDetail update(
            String ownerSubject,
            UUID memoryId,
            UpdateMemoryRequest request
    ) {
        MemoryFieldRules.Fields fields =
                fieldRules.validate(request.tripDate(), request.title(), request.story());

        OwnerMemoryDetail detail = transaction.execute(status -> {
            Memory memory = owned(ownerSubject, memoryId);

            memory.setTripDate(fields.tripDate());
            memory.setTitle(fields.title());
            memory.setStory(fields.story());
            memory.setVisibility(request.visibility());
            memory.markUpdated();

            return presenter.ownerDetail(memory, photoLookup.forMemory(memoryId));
        });

        log.info("Updated memory {}", memoryId);

        return detail;
    }

    /** Soft delete. Photo rows and stored objects are retained (section 18.3). */
    public void delete(String ownerSubject, UUID memoryId) {
        transaction.executeWithoutResult(status -> {
            Memory memory = owned(ownerSubject, memoryId);
            memory.setDeleted(true);
            memory.markUpdated();
        });

        log.info("Soft-deleted memory {}", memoryId);
    }

    private Memory owned(String ownerSubject, UUID memoryId) {
        return memoryRepository
                .findByIdAndOwnerSubjectAndDeletedFalse(memoryId, ownerSubject)
                .orElseThrow(MemoryNotFoundException::new);
    }
}
