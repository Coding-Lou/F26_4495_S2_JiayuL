package com.jay.outdoor.activity.repository;

import com.jay.outdoor.activity.entity.GroupEvent;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

public interface GroupEventRepository extends JpaRepository<GroupEvent, UUID> {
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE group_events
        SET seats_taken = seats_taken + 1
        WHERE id = :eventId
          AND status = 'OPEN'
          AND seats_taken < capacity
          AND registration_opens_at <= :now
          AND :now < registration_closes_at
        """, nativeQuery = true)
    int tryReserveSeat(@Param("eventId") UUID eventId,
                       @Param("now") Instant now);
}
