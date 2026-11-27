package com.jay.outdoor.activity.redis;

import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.entity.GroupEventStatus;
import com.jay.outdoor.activity.service.EventJoinReason;
import com.jay.outdoor.activity.service.EventRegistrationException;
import com.jay.outdoor.activity.service.GroupEventService;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.data.redis.connection.stream.RecordId;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

import static com.jay.outdoor.activity.support.GroupEventTestRequests.command;
import static org.junit.jupiter.api.Assertions.*;


class GroupEventRegistrationConsumerTests extends AbstractIntegrationTest {

    private final GroupEventRegistrationConsumer consumer;
    private final GroupEventSeatStore seatStore;
    private final GroupEventService eventService;
    private final StringRedisTemplate redis;
    private final JdbcTemplate jdbcTemplate;
    private final ApplicationContext applicationContext;

    @Autowired
    GroupEventRegistrationConsumerTests(GroupEventRegistrationConsumer consumer,
                                        GroupEventSeatStore seatStore,
                                        GroupEventService eventService,
                                        StringRedisTemplate redis,
                                        JdbcTemplate jdbcTemplate,
                                        ApplicationContext applicationContext) {
        this.consumer = consumer;
        this.seatStore = seatStore;
        this.eventService = eventService;
        this.redis = redis;
        this.jdbcTemplate = jdbcTemplate;
        this.applicationContext = applicationContext;
    }

    @BeforeEach
    void clearStream() {
        redis.delete(seatStore.streamKey());
    }

    @Test
    void scheduledPollerIsDisabledInIntegrationTests() {
        assertFalse(applicationContext.containsBean("groupEventRegistrationPoller"));
    }

    @Test
    void creatingConsumerGroupTwiceIsSafe() {
        assertDoesNotThrow(consumer::ensureGroup);
        assertDoesNotThrow(consumer::ensureGroup);
    }

    @Test
    void lostStreamGroupIsRecreatedBeforeNextMessage() {
        // clearStream removed the key and its consumer group after startup.
        assertDoesNotThrow(consumer::pollOnce);
        assertTrue(redis.opsForStream().groups(seatStore.streamKey()).stream()
                .anyMatch(group -> GroupEventRegistrationConsumer.GROUP.equals(group.groupName())));

        GroupEvent event = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24));
        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(event.getId(), "user-a"));

        consumer.pollOnce();

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND participant_subject = ? AND status = 'CONFIRMED'",
                Integer.class, event.getId(), "user-a"));
        assertEquals(0L, redis.opsForStream()
                .pending(seatStore.streamKey(), GroupEventRegistrationConsumer.GROUP)
                .getTotalPendingMessages());
    }

    @Test
    void admittedMessageCreatesConfirmedRegistrationAndIsAcknowledged() {
        consumer.ensureGroup();
        GroupEvent event = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24));

        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(event.getId(), "user-a"));

        consumer.pollOnce();

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND participant_subject = ? AND status = 'CONFIRMED'",
                Integer.class, event.getId(), "user-a"));
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class, event.getId()));
        assertEquals(11L, seatStore.getRemainingSeats(event.getId()));
        assertEquals(0L, redis.opsForStream()
                .pending(seatStore.streamKey(), GroupEventRegistrationConsumer.GROUP)
                .getTotalPendingMessages());
    }

    @Test
    void redeliveredMessageIsAcknowledgedWithoutReleasingTheSeat() {
        consumer.ensureGroup();
        GroupEvent event = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24));
        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(event.getId(), "user-a"));

        consumer.pollOnce();

        RecordId redeliveredId = redis.opsForStream().add(
                seatStore.streamKey(),
                Map.of(
                        "eventId", event.getId().toString(),
                        "participantSubject", "user-a"
                )
        );
        consumer.pollOnce();

        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class, event.getId()));
        assertEquals(11L, seatStore.getRemainingSeats(event.getId()));

        // A duplicate message must not create another registration.
        assertEquals(1, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND participant_subject = ?",
                Integer.class, event.getId(), "user-a"));

        assertEquals(1L, redis.opsForSet().size(seatStore.admittedKey(event.getId())));
        assertTrue(redis.opsForSet()
                .isMember(seatStore.admittedKey(event.getId()), "user-a"));

        assertEquals(redeliveredId.getValue(), redis.opsForStream()
                .groups(seatStore.streamKey()).stream()
                .filter(group -> GroupEventRegistrationConsumer.GROUP.equals(group.groupName()))
                .findFirst().orElseThrow().lastDeliveredId());
        assertEquals(0L, redis.opsForStream()
                .pending(seatStore.streamKey(), GroupEventRegistrationConsumer.GROUP)
                .getTotalPendingMessages());
    }

    @Test
    void cancelledEventLeavesMessagePendingWithoutChangingRedis() {
        consumer.ensureGroup();
        GroupEvent event = eventService.create("organizer-a",
                command(Instant.now().plus(2, ChronoUnit.DAYS), 12, 24));

        int updated = jdbcTemplate.update(
                "UPDATE group_events SET status = 'CANCELLED' WHERE id = ?",
                event.getId());
        assertEquals(1, updated);

        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(event.getId(), "user-a"));

        EventRegistrationException exception = assertThrows(
                EventRegistrationException.class,
                consumer::pollOnce
        );
        assertEquals(EventJoinReason.CANCELLED, exception.getReason());

        assertEquals(11L, seatStore.getRemainingSeats(event.getId()));
        assertEquals(Boolean.TRUE, redis.opsForSet()
                .isMember(seatStore.admittedKey(event.getId()), "user-a"));
        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT seats_taken FROM group_events WHERE id = ?",
                Integer.class, event.getId()));

        assertEquals(0, jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND participant_subject = ?",
                Integer.class, event.getId(), "user-a"));

        assertEquals(1L, redis.opsForStream()
                .pending(seatStore.streamKey(), GroupEventRegistrationConsumer.GROUP)
                .getTotalPendingMessages());
    }

}
