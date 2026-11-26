package com.jay.outdoor.activity.repository;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import com.jay.outdoor.activity.service.GroupEventService;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import jakarta.servlet.Registration;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static com.jay.outdoor.activity.support.GroupEventTestRequests.command;

public class EventRegistrationRepositoryTests extends AbstractIntegrationTest {

    private static final UUID TRAIL_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    private GroupEventService groupEventService;

    @Autowired
    private GroupEventRepository groupEventRepository;

    @Autowired
    private EventRegistrationRepository eventRegistrationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearEvents() {
        eventRegistrationRepository.deleteAll();
        groupEventRepository.deleteAll();
    }

    @Test
    void saveEventRegistrationTest() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        EventRegistration eventRegistration = new EventRegistration("user-a", event.getId(), Instant.now());
        eventRegistrationRepository.saveAndFlush(eventRegistration);

        EventRegistration found = eventRegistrationRepository.findById(eventRegistration.getId()).orElse(null);

        assertEquals(found.getStatus(), RegistrationStatus.PENDING );
    }

    @Test
    void uniqueEventRegistrationTest() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        EventRegistration firstEventRegistration = new EventRegistration("user-a", event.getId(), Instant.now());
        EventRegistration secondEventRegistration = new EventRegistration("user-a", event.getId(), Instant.now());

        eventRegistrationRepository.saveAndFlush(firstEventRegistration);

        assertThrows( DataIntegrityViolationException.class, ()-> eventRegistrationRepository.saveAndFlush(secondEventRegistration));
        assertEquals(1,  eventRegistrationRepository.findAll().size());
    }


    @Test
    void finderIgnoresCancelledRegistrations() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        EventRegistration eventRegistration = new EventRegistration("user-a", event.getId(), Instant.now());
        eventRegistrationRepository.saveAndFlush(eventRegistration);
        Optional<EventRegistration> found = eventRegistrationRepository.findByEventIdAndParticipantSubjectAndStatusIn(
                eventRegistration.getEventId(),
                "user-a",
                RegistrationStatus.ACTIVE_STATUSES
        );

        assertTrue(found.isPresent());

        jdbcTemplate.update("update event_registrations set status = 'CANCELLED' where id = ?", eventRegistration.getId());
        found = eventRegistrationRepository.findByEventIdAndParticipantSubjectAndStatusIn(
                eventRegistration.getEventId(),
                "user-a",
                RegistrationStatus.ACTIVE_STATUSES
        );

        assertTrue(found.isEmpty());
    }

}
