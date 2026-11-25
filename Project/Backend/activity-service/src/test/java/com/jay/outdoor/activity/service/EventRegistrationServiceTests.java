package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.entity.EventRegistration;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.RegistrationStatus;
import com.jay.outdoor.activity.repository.EventRegistrationRepository;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

public class EventRegistrationServiceTests extends AbstractIntegrationTest {
    private static final UUID TRAIL_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final int CAPACITY = 10;
    private enum OutcomeType {
        JOINED, FULL, OTHER
    }

    private record JoinOutcome(OutcomeType type, String error, EventRegistration eventRegistration) {}

    @Autowired
    private GroupEventService groupEventService;

    @Autowired
    private EventRegistrationService eventRegistrationService;

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
    void sameUserJoinEventTwice() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        JoinEventResult joinEventResult_first = eventRegistrationService.join(event.getId(), "user-a");

        assertTrue(joinEventResult_first.created());

        JoinEventResult joinEventResult_second = eventRegistrationService.join(event.getId(), "user-a");
        Integer seatsTaken = jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class,
                event.getId()
        );

        assertFalse(joinEventResult_second.created());
        assertEquals(joinEventResult_first.registration().getId(), joinEventResult_second.registration().getId());
        assertEquals(1, seatsTaken);
    }

    @Test
    void joinGroupEventSuccess() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));

        JoinEventResult joinEventResult = eventRegistrationService.join(event.getId(), "user-a");
        assertTrue(joinEventResult.created());
        RegistrationStatus status = jdbcTemplate.queryForObject(
                "SELECT status FROM event_registrations WHERE event_id = ? and participant_subject = ? ",
                RegistrationStatus.class,
                event.getId(),
                "user-a"
        );
        assertEquals(RegistrationStatus.CONFIRMED, status);

        Integer seatsTaken = jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class,
                event.getId()
        );

        assertEquals(1, seatsTaken);
    }

    @Test
    void lastSeatRegistration() {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        jdbcTemplate.update(
                "update group_events set seats_taken = ? where id = ?",
                CAPACITY-1,
                event.getId()
        );

        JoinEventResult joinEventResultFirst = eventRegistrationService.join(event.getId(), "user-a");
        assertTrue(joinEventResultFirst.created());

        EventRegistrationException exception = assertThrows(
                EventRegistrationException.class,
                () -> eventRegistrationService.join(event.getId(), "user-b")
        );
        assertEquals(EventJoinReason.FULL, exception.getReason());

        Integer rows = jdbcTemplate.queryForObject(
                "select count(*) from event_registrations where event_id = ? and participant_subject = ? ",
                Integer.class,
                event.getId(),
                "user-b"
        );
        assertEquals(0, rows);

        Integer seatsTaken = jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class,
                event.getId()
        );
        assertEquals(CAPACITY, seatsTaken);
    }

    @Test
    void registerNonExistingEvent() {
        UUID missingEventId = UUID.randomUUID();

        assertThrows(
                EventNotFoundException.class,
                () -> eventRegistrationService.join(missingEventId, "user-a")
        );
    }

    @Test
    void joiningCompletedEventReturnsClosed() {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        jdbcTemplate.update("UPDATE group_events SET status = 'COMPLETED' WHERE id = ?", event.getId());

        EventRegistrationException exception = assertThrows(EventRegistrationException.class,
                () -> eventRegistrationService.join(event.getId(), "user-a"));
        assertEquals(EventJoinReason.CLOSED, exception.getReason());
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ?", Integer.class, event.getId()));
    }

    @Test
    void joiningCancelledEventReturnsCancelledWithoutRegistration() {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        jdbcTemplate.update("UPDATE group_events SET status = 'CANCELLED' WHERE id = ?", event.getId());

        EventRegistrationException exception = assertThrows(EventRegistrationException.class,
                () -> eventRegistrationService.join(event.getId(), "user-a"));
        assertEquals(EventJoinReason.CANCELLED, exception.getReason());
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ?", Integer.class, event.getId()));
    }

    @Test
    void cancelReleasesOneSeatAndMarksRegistrationCancelled() {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        eventRegistrationService.join(event.getId(), "user-a");

        assertTrue(eventRegistrationService.cancel(event.getId(), "user-a"));
        assertEquals("CANCELLED", jdbcTemplate.queryForObject(
                "SELECT status FROM event_registrations WHERE event_id = ? AND participant_subject = ?",
                String.class, event.getId(), "user-a"));
        assertEquals(0, seatsTaken(event.getId()));
    }

    @Test
    void cancellingTwiceDoesNotReleaseTwoSeats() {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        eventRegistrationService.join(event.getId(), "user-a");

        assertTrue(eventRegistrationService.cancel(event.getId(), "user-a"));
        assertFalse(eventRegistrationService.cancel(event.getId(), "user-a"));
        assertEquals(0, seatsTaken(event.getId()));
    }

    @Test
    void failingToReleaseSeatRollsBackCancellation() {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        eventRegistrationService.join(event.getId(), "user-a");
        jdbcTemplate.update("UPDATE group_events SET seats_taken = 0 WHERE id = ?", event.getId());

        assertThrows(IllegalStateException.class, () -> eventRegistrationService.cancel(event.getId(), "user-a"));
        assertEquals("CONFIRMED", jdbcTemplate.queryForObject(
                "SELECT status FROM event_registrations WHERE event_id = ? AND participant_subject = ?",
                String.class, event.getId(), "user-a"));
        assertEquals(0, seatsTaken(event.getId()));
    }

    @Test
    void cancelledUserCanJoinAgain() {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        UUID oldId = eventRegistrationService.join(event.getId(), "user-a").registration().getId();
        assertTrue(eventRegistrationService.cancel(event.getId(), "user-a"));

        JoinEventResult again = eventRegistrationService.join(event.getId(), "user-a");
        assertTrue(again.created());
        assertNotEquals(oldId, again.registration().getId());
        assertEquals(1, seatsTaken(event.getId()));
        assertEquals(2, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND participant_subject = ?",
                Integer.class, event.getId(), "user-a"));
    }

    @Test
    void concurrentCancelsReleaseExactlyOneSeat() throws Exception {
        GroupEvent event = groupEventService.create("organizer-a", command(Instant.now().plus(2, ChronoUnit.DAYS)));
        eventRegistrationService.join(event.getId(), "user-a");
        CountDownLatch gate = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(20);
        List<Future<Boolean>> futures = new ArrayList<>();
        try {
            for (int i = 0; i < 20; i++) {
                futures.add(pool.submit(() -> {
                    gate.await();
                    return eventRegistrationService.cancel(event.getId(), "user-a");
                }));
            }
            gate.countDown();
            int released = 0;
            for (Future<Boolean> future : futures) {
                if (future.get(30, TimeUnit.SECONDS)) released++;
            }
            assertEquals(1, released);
            assertEquals(0, seatsTaken(event.getId()));
            assertEquals("CANCELLED", jdbcTemplate.queryForObject(
                    "SELECT status FROM event_registrations WHERE event_id = ? AND participant_subject = ?",
                    String.class, event.getId(), "user-a"));
            assertEquals(1, jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM event_registrations WHERE event_id = ?", Integer.class, event.getId()));
        } finally {
            gate.countDown();
            pool.shutdownNow();
        }
    }

    private int seatsTaken(UUID eventId) {
        return jdbcTemplate.queryForObject("SELECT seats_taken FROM group_events WHERE id = ?", Integer.class, eventId);
    }

    @Test
    void sameUserJoiningConcurrentlyCreatesOneRegistration() throws ExecutionException, InterruptedException, TimeoutException {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        CountDownLatch countDownLatch = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(20);
        List<Future<JoinEventResult>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < 20; i++) {
                Future<JoinEventResult> cur =  pool.submit( () -> {
                    countDownLatch.await();
                    return eventRegistrationService.join(event.getId(), "user-a");
                });
                futures.add(cur);
            }

            countDownLatch.countDown();

            int success = 0, repeated = 0;
            HashSet<UUID> registrationIds = new HashSet<>();
            for (Future<JoinEventResult> future : futures) {
                JoinEventResult joinEventResult = future.get(30, TimeUnit.SECONDS);
                registrationIds.add(joinEventResult.registration().getId());
                if (joinEventResult.created()) {
                    success++;
                } else {
                    repeated++;
                }
            }

            assertEquals(19, repeated);
            assertEquals(1, success);
            assertEquals(1, registrationIds.size());

            Integer rows = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM event_registrations WHERE participant_subject = ?",
                    Integer.class,
                    "user-a"
            );
            assertEquals(1, rows);

            Integer seatsTaken = jdbcTemplate.queryForObject(
                    "SELECT seats_taken FROM group_events WHERE id = ?",
                    Integer.class,
                    event.getId()
            );
            assertEquals(1, seatsTaken);

        } finally {
            countDownLatch.countDown();
            pool.shutdownNow();
        }
    }

    @Test
    void concurrentUsersCannotExceedEventCapacity() throws ExecutionException, InterruptedException, TimeoutException {
        Instant start = Instant.now().plus(2, ChronoUnit.DAYS);
        GroupEvent event = groupEventService.create("organizer-a", command(start));
        CountDownLatch countDownLatch = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(200);
        List<Future<JoinOutcome>> futures = new ArrayList<>();

        try {
            for (int i = 0; i < 200; i++) {
                String curUser = "user-" + i;
                Future<JoinOutcome> cur = pool.submit(() -> {
                    try {
                        countDownLatch.await();

                        JoinEventResult result =
                                eventRegistrationService.join(event.getId(), curUser);

                        return result.created()
                                ? new JoinOutcome(OutcomeType.JOINED, null, result.registration())
                                : new JoinOutcome(OutcomeType.OTHER, "Unexpected created=false", result.registration());

                    } catch (EventRegistrationException e) {
                        if (e.getReason() == EventJoinReason.FULL) {
                            return new JoinOutcome(OutcomeType.FULL, null, null);
                        }
                        return new JoinOutcome(OutcomeType.OTHER, e.getClass().getSimpleName()
                                + ": " + e.getReason(), null);

                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return new JoinOutcome(OutcomeType.OTHER, e.getClass().getSimpleName(), null);

                    } catch (Exception e) {
                        return new JoinOutcome(OutcomeType.OTHER, e.getClass().getSimpleName(), null);
                    }
                });
                futures.add(cur);
            }

            int success = 0, full = 0, otherEx = 0;
            List<String> otherErrors = new ArrayList<>();
            countDownLatch.countDown();

            for (Future<JoinOutcome> future : futures) {
                JoinOutcome joinOutcome = future.get(30, TimeUnit.SECONDS);
                switch (joinOutcome.type()) {
                    case JOINED -> success++;
                    case FULL -> full++;
                    case OTHER -> {
                        otherEx++;
                        otherErrors.add(joinOutcome.error());
                    }
                }
            }

            assertEquals(0, otherEx, "Unexpected outcomes: " + otherErrors);
            assertEquals(CAPACITY, success);
            assertEquals(200 - CAPACITY, full);

            Integer totalRows = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM event_registrations WHERE event_id = ?",
                    Integer.class,
                    event.getId()
            );
            assertEquals(CAPACITY, totalRows);

            Integer confirmed = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = ?",
                    Integer.class,
                    event.getId(),
                    RegistrationStatus.CONFIRMED.name()
            );
            assertEquals(CAPACITY, confirmed);

            Integer pending = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = ?",
                    Integer.class,
                    event.getId(),
                    RegistrationStatus.PENDING.name()
            );
            assertEquals(0, pending);

            Integer seatsTaken = jdbcTemplate.queryForObject(
                    "SELECT seats_taken FROM group_events WHERE id = ?",
                    Integer.class,
                    event.getId()
            );
            assertEquals(CAPACITY, seatsTaken);

        } finally {
            countDownLatch.countDown();
            pool.shutdownNow();
        }
    }

    private static CreateGroupEventRequest command(Instant start) {
        return com.jay.outdoor.activity.support.GroupEventTestRequests.command(start, CAPACITY, 24);
    }
}
