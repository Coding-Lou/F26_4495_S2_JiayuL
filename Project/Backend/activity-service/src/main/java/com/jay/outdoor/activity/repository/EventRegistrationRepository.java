package com.jay.outdoor.activity.repository;

import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRegistrationRepository extends JpaRepository<EventRegistration, UUID> {

    Optional<EventRegistration> findByEventIdAndParticipantSubjectAndStatusIn(UUID eventId, String participantSubject, List<RegistrationStatus> statuses);
}
