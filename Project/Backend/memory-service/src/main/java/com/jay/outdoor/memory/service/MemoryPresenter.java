package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.dto.MemoryPhotoResponse;
import com.jay.outdoor.memory.dto.OwnerMemoryDetail;
import com.jay.outdoor.memory.dto.OwnerMemorySummary;
import com.jay.outdoor.memory.dto.PublicMemoryDetail;
import com.jay.outdoor.memory.dto.PublicMemorySummary;
import com.jay.outdoor.memory.dto.PublicPhoto;
import com.jay.outdoor.memory.entity.Memory;
import com.jay.outdoor.memory.entity.MemoryPhoto;
import com.jay.outdoor.memory.storage.MemoryPhotoStorage;
import com.jay.outdoor.memory.storage.SignedPhotoUrl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/**
 * Builds owner and public responses. Signing a photo URL here is how visibility
 * reaches the photo: a URL exists only inside a response the caller may receive.
 * Photo lists passed in are in ascending position; the first is the cover (D8).
 */
@Component
public class MemoryPresenter {

    private final MemoryPhotoStorage storage;
    private final Duration urlTtl;

    public MemoryPresenter(
            MemoryPhotoStorage storage,
            @Value("${memory.photos.url-ttl:15m}") Duration urlTtl
    ) {
        this.storage = storage;
        this.urlTtl = urlTtl;
    }

    public MemoryPhotoResponse ownerPhoto(MemoryPhoto photo) {
        SignedPhotoUrl url = sign(photo);
        return new MemoryPhotoResponse(photo.getId(), photo.getPosition(), url.url(), url.expiresAt());
    }

    public PublicPhoto publicPhoto(MemoryPhoto photo) {
        SignedPhotoUrl url = sign(photo);
        return new PublicPhoto(photo.getId(), photo.getPosition(), url.url(), url.expiresAt());
    }

    public OwnerMemoryDetail ownerDetail(Memory memory, List<MemoryPhoto> photos) {
        return new OwnerMemoryDetail(
                memory.getId(),
                memory.getTrailId(),
                memory.getTripDate(),
                memory.getTitle(),
                memory.getStory(),
                memory.getVisibility(),
                photos.stream().map(this::ownerPhoto).toList(),
                memory.getCreatedAt(),
                memory.getUpdatedAt()
        );
    }

    public OwnerMemorySummary ownerSummary(Memory memory, List<MemoryPhoto> photos) {
        return new OwnerMemorySummary(
                memory.getId(),
                memory.getTrailId(),
                memory.getTripDate(),
                memory.getTitle(),
                memory.getVisibility(),
                photos.size(),
                photos.isEmpty() ? null : ownerPhoto(photos.getFirst()),
                memory.getCreatedAt(),
                memory.getUpdatedAt()
        );
    }

    public PublicMemorySummary publicSummary(Memory memory, List<MemoryPhoto> photos) {
        StoryExcerpt excerpt = StoryExcerpt.of(memory.getStory());

        return new PublicMemorySummary(
                memory.getId(),
                memory.getTrailId(),
                memory.getTripDate(),
                memory.getTitle(),
                excerpt.text(),
                excerpt.truncated(),
                photos.size(),
                photos.isEmpty() ? null : publicPhoto(photos.getFirst()),
                memory.getCreatedAt()
        );
    }

    public PublicMemoryDetail publicDetail(Memory memory, List<MemoryPhoto> photos) {
        return new PublicMemoryDetail(
                memory.getId(),
                memory.getTrailId(),
                memory.getTripDate(),
                memory.getTitle(),
                memory.getStory(),
                photos.stream().map(this::publicPhoto).toList(),
                memory.getCreatedAt()
        );
    }

    private SignedPhotoUrl sign(MemoryPhoto photo) {
        return storage.presentationUrl(photo.getObjectKey(), photo.getMediaType(), urlTtl);
    }
}
