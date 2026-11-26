package com.jay.outdoor.activity.repository;

import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, UUID> {

    Optional<EventRegistration> findByEventIdAndParticipantSubjectAndStatusIn(UUID eventId, String participantSubject, List<RegistrationStatus> statuses);

    @Modifying
    @Transactional
    @Query(value = """
        UPDATE event_registrations
        SET status = 'CANCELLED',
            updated_at = :now
        WHERE event_id = :eventId
          AND participant_subject = :participantSubject
          AND status = 'CONFIRMED'
        """, nativeQuery = true)
    int tryCancelRegistration(@Param("eventId") UUID eventId,
                              @Param("participantSubject") String participantSubject,
                              @Param("now") Instant now);
}
