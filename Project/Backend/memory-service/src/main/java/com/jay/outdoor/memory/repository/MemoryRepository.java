package com.jay.outdoor.memory.repository;

import com.jay.outdoor.memory.entity.Memory;
import com.jay.outdoor.memory.entity.MemoryVisibility;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface MemoryRepository extends JpaRepository<Memory, UUID> {

    /** Owner lookup: missing, deleted, and foreign Memories are all absent (D14). */
    Optional<Memory> findByIdAndOwnerSubjectAndDeletedFalse(UUID id, String ownerSubject);

    /** The same owner lookup, holding a row lock until the transaction ends. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select m from Memory m
            where m.id = :id
              and m.ownerSubject = :ownerSubject
              and m.deleted = false
            """)
    Optional<Memory> findOwnedForUpdate(
            @Param("id") UUID id,
            @Param("ownerSubject") String ownerSubject
    );

    Page<Memory> findByOwnerSubjectAndDeletedFalse(String ownerSubject, Pageable pageable);

    Page<Memory> findByTrailIdAndVisibilityAndDeletedFalse(
            UUID trailId,
            MemoryVisibility visibility,
            Pageable pageable
    );

    Optional<Memory> findByIdAndVisibilityAndDeletedFalse(
            UUID id,
            MemoryVisibility visibility
    );
}
