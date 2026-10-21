package com.jay.outdoor.memory.repository;

import com.jay.outdoor.memory.entity.MemoryPhoto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MemoryPhotoRepository extends JpaRepository<MemoryPhoto, UUID> {

    List<MemoryPhoto> findByMemoryIdOrderByPositionAsc(UUID memoryId);

    /** Photos of a whole page of Memories in one query. */
    List<MemoryPhoto> findByMemoryIdInOrderByPositionAsc(Collection<UUID> memoryIds);

    Optional<MemoryPhoto> findByIdAndMemoryId(UUID id, UUID memoryId);

    long countByMemoryId(UUID memoryId);

    @Query("select coalesce(max(p.position), -1) from MemoryPhoto p where p.memoryId = :memoryId")
    int findMaxPosition(@Param("memoryId") UUID memoryId);
}
