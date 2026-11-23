package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.GroupEventStatus;
import com.jay.outdoor.activity.exception.TrailNotFoundException;
import com.jay.outdoor.activity.exception.TrailServiceUnavailableException;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

class GroupEventServiceTests extends AbstractIntegrationTest {

    private static final UUID TRAIL_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Autowired
    private GroupEventService service;

    @Autowired
    private GroupEventRepository repository;

    @Autowired
    private EventRegistrationRepository eventRegistrationRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void clearEvents() {
        eventRegistrationRepository.deleteAll();
        repository.deleteAll();
    }

    @Test
    void createsAnOpenEventOwnedByTheCaller() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = service.create("user-a", command(start));

        GroupEvent stored = repository.findById(event.getId()).orElseThrow();
        assertEquals("user-a", stored.getOrganizerSubject());
        assertEquals(TRAIL_ID, stored.getTrailId());
        assertEquals(12, stored.getCapacity());
        assertEquals(GroupEventStatus.OPEN, stored.getStatus());
        assertEquals(1, repository.count());
    }

    @Test
    void rejectsAnEventThatHasAlreadyStarted() {
        Instant start = Instant.now().minus(1, ChronoUnit.HOURS);

        assertThrows(IllegalArgumentException.class,
                () -> service.create("user-a", command(start)));
        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void rejectsAnEventThatHasRegisterClosesDateLaterThanStarted() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);

        CreateGroupEventRequest request =  new CreateGroupEventRequest(
                TRAIL_ID,
                "Weekend hike",
                "Meet at the trailhead",
                12,
                start.minus(72, ChronoUnit.HOURS),
                start.plus(1, ChronoUnit.HOURS),
                start,
                start.plus(4, ChronoUnit.HOURS)
        );

        assertThrows(GroupEventValidationException.class,
                () -> service.create("user-a", request));
        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void rejectsAnEventThatHasRegisterOpensDateLaterThanClosesDate() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);

        CreateGroupEventRequest request =  new CreateGroupEventRequest(
                TRAIL_ID,
                "Weekend hike",
                "Meet at the trailhead",
                12,
                start.minus(24, ChronoUnit.HOURS),
                start.minus(48, ChronoUnit.HOURS),
                start,
                start.plus(4, ChronoUnit.HOURS)
        );

        assertThrows(GroupEventValidationException.class,
                () -> service.create("user-a", request));
        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void registrationStartDateSameAsClosesDate() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);

        CreateGroupEventRequest request =  new CreateGroupEventRequest(
                TRAIL_ID,
                "Weekend hike",
                "Meet at the trailhead",
                12,
                start.minus(24, ChronoUnit.HOURS),
                start.minus(24, ChronoUnit.HOURS),
                start,
                start.plus(4, ChronoUnit.HOURS)
        );

        assertThrows(GroupEventValidationException.class,
                () -> service.create("user-a", request));
        assertTrue(repository.findAll().isEmpty());
    }

    @Test
    void rejectsAnUnknownTrailWithoutWritingAnEvent() {
        when(trailCatalogClient.trailExists(TRAIL_ID)).thenReturn(false);

        assertThrows(TrailNotFoundException.class,
                () -> service.create("user-a", command(Instant.now().plus(2, ChronoUnit.DAYS))));
        assertEquals(0, repository.count());
    }

    @Test
    void rejectsAnUnavailableTrailServiceWithoutWritingAnEvent() {
        when(trailCatalogClient.trailExists(TRAIL_ID))
                .thenThrow(new TrailServiceUnavailableException());

        assertThrows(TrailServiceUnavailableException.class,
                () -> service.create("user-a", command(Instant.now().plus(2, ChronoUnit.DAYS))));
        assertEquals(0, repository.count());
    }


    @Test
    void savingStaleEventShouldNotOverwriteSeatsTaken() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = service.create("user-a", command(start));
        UUID eventId = event.getId();
        jdbcTemplate.update(
                "UPDATE group_events SET seats_taken = 1 WHERE id = ?",
                eventId
        );

        repository.save(event);

        GroupEvent reloaded = repository.findById(eventId)
                .orElseThrow();

        assertThat(reloaded.getSeatsTaken()).isEqualTo(1);
    }

    @Test
    void secondClaimOnTheLastSeatChangesNothing() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);

        CreateGroupEventRequest request =  new CreateGroupEventRequest(
                TRAIL_ID,
                "Weekend hike",
                "Meet at the trailhead",
                1,
                start.minus(48, ChronoUnit.HOURS),
                start.minus(24, ChronoUnit.HOURS),
                start,
                start.plus(4, ChronoUnit.HOURS)
        );

        UUID eventId = service.create("organizer", request).getId();

        int first = repository.tryReserveSeat(eventId, start.minus(36, ChronoUnit.HOURS));
        int second = repository.tryReserveSeat(eventId, start.minus(36, ChronoUnit.HOURS));

        Integer seatsTaken = jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class,
                eventId
        );

        assertEquals(1, first);
        assertEquals(0, second);
        assertEquals(1, seatsTaken);

    }

    @Test
    void claimBeforeRegistrationOpensChangesNothing() {
        Instant start = Instant.now().plus(1, ChronoUnit.DAYS);

        CreateGroupEventRequest request =  new CreateGroupEventRequest(
                TRAIL_ID,
                "Weekend hike",
                "Meet at the trailhead",
                1,
                start.minus(48, ChronoUnit.HOURS),
                start.minus(24, ChronoUnit.HOURS),
                start,
                start.plus(4, ChronoUnit.HOURS)
        );

        UUID eventId = service.create("organizer", request).getId();

        int first = repository.tryReserveSeat(eventId, start.minus(49, ChronoUnit.HOURS));

        Integer seatsTaken = jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class,
                eventId
        );

        assertEquals(0, first);
        assertEquals(0, seatsTaken);

    }

    private static CreateGroupEventRequest command(Instant start) {
        return new CreateGroupEventRequest(
                TRAIL_ID,
                "Weekend hike",
                "Meet at the trailhead",
                12,
                start.minus(72, ChronoUnit.HOURS),
                start.minus(48, ChronoUnit.HOURS),
                start,
                start.plus(4, ChronoUnit.HOURS)
        );
    }


}
