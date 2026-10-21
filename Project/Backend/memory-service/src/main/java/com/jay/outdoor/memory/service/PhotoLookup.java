package com.jay.outdoor.memory.service;

import com.jay.outdoor.memory.entity.Memory;
import com.jay.outdoor.memory.entity.MemoryPhoto;
import com.jay.outdoor.memory.repository.MemoryPhotoRepository;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/** Loads the photos of a page of Memories in one query (section 19). */
@Component
public class PhotoLookup {

    private final MemoryPhotoRepository photoRepository;

    public PhotoLookup(MemoryPhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    /** Photo lists per Memory id, each in ascending position. */
    public Map<UUID, List<MemoryPhoto>> forMemories(List<Memory> memories) {
        if (memories.isEmpty()) {
            return Map.of();
        }

        List<UUID> ids = memories.stream().map(Memory::getId).toList();

        return photoRepository.findByMemoryIdInOrderByPositionAsc(ids)
                .stream()
                .collect(Collectors.groupingBy(MemoryPhoto::getMemoryId, Collectors.toList()));
    }

    public List<MemoryPhoto> forMemory(UUID memoryId) {
        return photoRepository.findByMemoryIdOrderByPositionAsc(memoryId);
    }
}
