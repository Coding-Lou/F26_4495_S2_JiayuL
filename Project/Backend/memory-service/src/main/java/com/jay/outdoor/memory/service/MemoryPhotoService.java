package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.dto.MemoryPhotoResponse;
import com.jay.outdoor.memory.dto.ReorderPhotosRequest;
import com.jay.outdoor.memory.entity.Memory;
import com.jay.outdoor.memory.entity.MemoryPhoto;
import com.jay.outdoor.memory.exception.MemoryNotFoundException;
import com.jay.outdoor.memory.exception.PayloadTooLargeException;
import com.jay.outdoor.memory.exception.PhotoLimitReachedException;
import com.jay.outdoor.memory.exception.PhotoNotFoundException;
import com.jay.outdoor.memory.exception.RequestValidationException;
import com.jay.outdoor.memory.image.PhotoSanitizer;
import com.jay.outdoor.memory.image.SanitizedPhoto;
import com.jay.outdoor.memory.repository.MemoryPhotoRepository;
import com.jay.outdoor.memory.repository.MemoryRepository;
import com.jay.outdoor.memory.storage.MemoryPhotoStorage;
import com.jay.outdoor.memory.storage.PhotoObjectKeys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Photo add, reorder, and remove. Every operation starts with the owner-scoped
 * Memory lookup; there is no operation addressed by photo id or object key alone.
 * Storage writes happen outside database transactions (section 18.1).
 */
@Service
public class MemoryPhotoService {

    public static final int MAX_PHOTOS = 5;
    public static final long MAX_UPLOAD_BYTES = 10L * 1024 * 1024;

    private static final Logger log = LoggerFactory.getLogger(MemoryPhotoService.class);

    private final MemoryRepository memoryRepository;
    private final MemoryPhotoRepository photoRepository;
    private final PhotoSanitizer sanitizer;
    private final MemoryPhotoStorage storage;
    private final MemoryPresenter presenter;
    private final TransactionTemplate transaction;

    public MemoryPhotoService(
            MemoryRepository memoryRepository,
            MemoryPhotoRepository photoRepository,
            PhotoSanitizer sanitizer,
            MemoryPhotoStorage storage,
            MemoryPresenter presenter,
            PlatformTransactionManager transactionManager
    ) {
        this.memoryRepository = memoryRepository;
        this.photoRepository = photoRepository;
        this.sanitizer = sanitizer;
        this.storage = storage;
        this.presenter = presenter;
        this.transaction = new TransactionTemplate(transactionManager);
    }

    /** Section 13.8. The declared part type and the client filename are ignored. */
    public MemoryPhotoResponse add(String ownerSubject, UUID memoryId, MultipartFile file) {
        if (file.getSize() > MAX_UPLOAD_BYTES) {
            throw new PayloadTooLargeException();
        }

        byte[] upload;
        try {
            upload = file.getBytes();
        } catch (IOException ex) {
            throw new RequestValidationException("file", "could not be read");
        }

        // Type, dimensions, decode, and re-encode. The upload itself is never stored.
        SanitizedPhoto photo = sanitizer.sanitize(upload);

        // Read-only pre-check.
        memoryRepository.findByIdAndOwnerSubjectAndDeletedFalse(memoryId, ownerSubject)
                .orElseThrow(MemoryNotFoundException::new);
        if (photoRepository.countByMemoryId(memoryId) >= MAX_PHOTOS) {
            throw new PhotoLimitReachedException();
        }

        UUID photoId = UUID.randomUUID();
        String objectKey = PhotoObjectKeys.photoKey(memoryId, photoId, photo.extension());

        storage.put(objectKey, photo.content(), photo.mediaType());

        MemoryPhoto saved;
        try {
            saved = transaction.execute(status -> {
                Memory memory = memoryRepository.findOwnedForUpdate(memoryId, ownerSubject)
                        .orElseThrow(MemoryNotFoundException::new);

                if (photoRepository.countByMemoryId(memoryId) >= MAX_PHOTOS) {
                    throw new PhotoLimitReachedException();
                }

                int position = photoRepository.findMaxPosition(memoryId) + 1;
                MemoryPhoto inserted = photoRepository.save(new MemoryPhoto(
                        photoId, memoryId, objectKey, photo.mediaType(), position));
                memory.markUpdated();
                return inserted;
            });
        } catch (RuntimeException ex) {
            compensate(objectKey);
            throw ex;
        }

        log.info("Added photo {} to memory {}", photoId, memoryId);

        return presenter.ownerPhoto(saved);
    }

    /** Section 13.9: an exact permutation of the current photo ids. */
    public List<MemoryPhotoResponse> reorder(
            String ownerSubject,
            UUID memoryId,
            ReorderPhotosRequest request
    ) {
        List<MemoryPhotoResponse> reordered = transaction.execute(status -> {
            Memory memory = memoryRepository.findOwnedForUpdate(memoryId, ownerSubject)
                    .orElseThrow(MemoryNotFoundException::new);

            List<MemoryPhoto> photos = photoRepository.findByMemoryIdOrderByPositionAsc(memoryId);
            List<UUID> order = request.photoIds();

            if (!isExactPermutation(order, photos)) {
                throw new RequestValidationException("photoIds",
                        "must list each of the memory's photos exactly once");
            }

            Map<UUID, MemoryPhoto> byId = photos.stream()
                    .collect(Collectors.toMap(MemoryPhoto::getId, Function.identity()));

            // The unique (memory_id, position) constraint is deferred to commit.
            for (int position = 0; position < order.size(); position++) {
                byId.get(order.get(position)).setPosition(position);
            }
            memory.markUpdated();

            return order.stream()
                    .map(byId::get)
                    .map(presenter::ownerPhoto)
                    .toList();
        });

        log.info("Reordered photos of memory {}", memoryId);

        return reordered;
    }

    /** Section 13.10: delete the row, then the object after commit. */
    public void remove(String ownerSubject, UUID memoryId, UUID photoId) {
        String objectKey = transaction.execute(status -> {
            Memory memory = memoryRepository.findOwnedForUpdate(memoryId, ownerSubject)
                    .orElseThrow(MemoryNotFoundException::new);
            MemoryPhoto photo = photoRepository.findByIdAndMemoryId(photoId, memoryId)
                    .orElseThrow(PhotoNotFoundException::new);

            photoRepository.delete(photo);
            memory.markUpdated();
            return photo.getObjectKey();
        });

        log.info("Removed photo {} from memory {}", photoId, memoryId);

        try {
            storage.delete(objectKey);
        } catch (RuntimeException ex) {
            log.warn("Photo {} was removed but its object {} could not be deleted; orphaned",
                    photoId, objectKey);
        }
    }

    private void compensate(String objectKey) {
        try {
            storage.delete(objectKey);
            log.info("Deleted object {} after its photo row could not be written", objectKey);
        } catch (RuntimeException ex) {
            log.warn("Compensation delete failed; orphaned object {}", objectKey);
        }
    }

    private static boolean isExactPermutation(List<UUID> order, List<MemoryPhoto> photos) {
        if (order.size() != photos.size() || order.stream().anyMatch(Objects::isNull)) {
            return false;
        }

        Set<UUID> requested = new HashSet<>(order);
        Set<UUID> current = photos.stream().map(MemoryPhoto::getId).collect(Collectors.toSet());

        return requested.size() == order.size() && requested.equals(current);
    }
}
