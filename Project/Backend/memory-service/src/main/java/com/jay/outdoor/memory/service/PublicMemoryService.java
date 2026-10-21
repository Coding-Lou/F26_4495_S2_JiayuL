package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.client.TrailCatalogClient;
import com.jay.outdoor.memory.dto.MemoryPage;
import com.jay.outdoor.memory.dto.PublicMemoryDetail;
import com.jay.outdoor.memory.dto.PublicMemorySummary;
import com.jay.outdoor.memory.entity.Memory;
import com.jay.outdoor.memory.entity.MemoryPhoto;
import com.jay.outdoor.memory.entity.MemoryVisibility;
import com.jay.outdoor.memory.exception.MemoryNotFoundException;
import com.jay.outdoor.memory.exception.TrailNotFoundException;
import com.jay.outdoor.memory.repository.MemoryRepository;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Public reads: PUBLIC, non-deleted Memories on trails that still exist. Each
 * request makes one trail-service call, never one per row, and never inside a
 * transaction.
 */
@Service
public class PublicMemoryService {

    private final MemoryRepository memoryRepository;
    private final PhotoLookup photoLookup;
    private final MemoryPresenter presenter;
    private final TrailCatalogClient trailCatalogClient;
    private final TransactionTemplate readOnlyTransaction;

    public PublicMemoryService(
            MemoryRepository memoryRepository,
            PhotoLookup photoLookup,
            MemoryPresenter presenter,
            TrailCatalogClient trailCatalogClient,
            PlatformTransactionManager transactionManager
    ) {
        this.memoryRepository = memoryRepository;
        this.photoLookup = photoLookup;
        this.presenter = presenter;
        this.trailCatalogClient = trailCatalogClient;
        this.readOnlyTransaction = new TransactionTemplate(transactionManager);
        this.readOnlyTransaction.setReadOnly(true);
    }

    public MemoryPage<PublicMemorySummary> listForTrail(UUID trailId, int page, int size) {
        var pageable = MemoryPaging.of(page, size);

        if (!trailCatalogClient.trailExists(trailId)) {
            throw new TrailNotFoundException(HttpStatus.NOT_FOUND);
        }

        return readOnlyTransaction.execute(status -> {
            Page<Memory> result = memoryRepository.findByTrailIdAndVisibilityAndDeletedFalse(
                    trailId, MemoryVisibility.PUBLIC, pageable);
            Map<UUID, List<MemoryPhoto>> photos = photoLookup.forMemories(result.getContent());

            List<PublicMemorySummary> items = result.getContent().stream()
                    .map(memory -> presenter.publicSummary(
                            memory, photos.getOrDefault(memory.getId(), List.of())))
                    .toList();

            return MemoryPage.of(result, items);
        });
    }

    /** PRIVATE, deleted, missing, and on-a-deleted-trail are the same 404. */
    public PublicMemoryDetail get(UUID memoryId) {
        Memory memory = memoryRepository
                .findByIdAndVisibilityAndDeletedFalse(memoryId, MemoryVisibility.PUBLIC)
                .orElseThrow(MemoryNotFoundException::new);

        if (!trailCatalogClient.trailExists(memory.getTrailId())) {
            throw new MemoryNotFoundException();
        }

        return readOnlyTransaction.execute(status ->
                presenter.publicDetail(memory, photoLookup.forMemory(memoryId)));
    }
}
