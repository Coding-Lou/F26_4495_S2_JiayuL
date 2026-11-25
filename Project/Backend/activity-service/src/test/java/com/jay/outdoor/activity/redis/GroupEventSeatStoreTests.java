package com.jay.outdoor.activity.redis;

import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class GroupEventSeatStoreTests extends AbstractIntegrationTest {

    @Autowired
    GroupEventSeatStore seatStore;

    @Autowired
    StringRedisTemplate redis;

    @Test
    void takesThreeSeatsFromTen() {
        UUID eventId = UUID.randomUUID();
        seatStore.setRemainingSeats(eventId, 10);

        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(eventId, "user-1"));
        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(eventId, "user-2"));
        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(eventId, "user-3"));
        assertEquals(7L, seatStore.getRemainingSeats(eventId));
        assertTrue(Boolean.TRUE.equals(redis.opsForSet().isMember(seatStore.admittedKey(eventId), "user-1")));
    }

    @Test
    void duplicateDoesNotTakeAnotherSeat() {
        UUID eventId = UUID.randomUUID();
        seatStore.setRemainingSeats(eventId, 10);

        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(eventId, "user-1"));
        assertEquals(AdmissionResult.DUPLICATE, seatStore.admit(eventId, "user-1"));
        assertEquals(9L, seatStore.getRemainingSeats(eventId));
        assertEquals(1L, redis.opsForSet().size(seatStore.admittedKey(eventId)));
    }

    @Test
    void fullEventNeverGoesNegative() {
        UUID eventId = UUID.randomUUID();
        seatStore.setRemainingSeats(eventId, 0);

        assertEquals(AdmissionResult.FULL, seatStore.admit(eventId, "user-1"));
        assertEquals(0L, seatStore.getRemainingSeats(eventId));
        assertFalse(Boolean.TRUE.equals(redis.hasKey(seatStore.admittedKey(eventId))));
    }

    @Test
    void missingCounterIsNotReadyAndIsNotCreated() {
        UUID eventId = UUID.randomUUID();

        assertEquals(AdmissionResult.NOT_READY, seatStore.admit(eventId, "user-1"));
        assertNull(seatStore.getRemainingSeats(eventId));
        assertFalse(Boolean.TRUE.equals(redis.hasKey(seatStore.admittedKey(eventId))));
    }

    @Test
    void admittedUserRetryAfterEventFillsIsDuplicate() {
        UUID eventId = UUID.randomUUID();
        seatStore.setRemainingSeats(eventId, 1);

        assertEquals(AdmissionResult.ADMITTED, seatStore.admit(eventId, "user-1"));
        assertEquals(AdmissionResult.DUPLICATE, seatStore.admit(eventId, "user-1"));
        assertEquals(AdmissionResult.FULL, seatStore.admit(eventId, "user-2"));
        assertEquals(0L, seatStore.getRemainingSeats(eventId));
    }

    @Test
    void twoHundredUsersCompeteForTenSeats() throws Exception {
        UUID eventId = UUID.randomUUID();
        seatStore.setRemainingSeats(eventId, 10);

        List<AdmissionResult> results = admitConcurrently(eventId, 200, i -> "user-" + i);

        assertEquals(10, results.stream().filter(r -> r == AdmissionResult.ADMITTED).count());
        assertEquals(190, results.stream().filter(r -> r == AdmissionResult.FULL).count());
        assertEquals(0L, seatStore.getRemainingSeats(eventId));
        assertEquals(10L, redis.opsForSet().size(seatStore.admittedKey(eventId)));
    }

    @Test
    void sameUserTwentyTimesOnlyGetsOneSeat() throws Exception {
        UUID eventId = UUID.randomUUID();
        seatStore.setRemainingSeats(eventId, 10);

        List<AdmissionResult> results = admitConcurrently(eventId, 20, i -> "same-user");

        assertEquals(1, results.stream().filter(r -> r == AdmissionResult.ADMITTED).count());
        assertEquals(19, results.stream().filter(r -> r == AdmissionResult.DUPLICATE).count());
        assertEquals(9L, seatStore.getRemainingSeats(eventId));
        assertEquals(1L, redis.opsForSet().size(seatStore.admittedKey(eventId)));
    }

    private List<AdmissionResult> admitConcurrently(UUID eventId, int count,
            IntFunction<String> participant) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(Math.min(count, 32));
        CountDownLatch start = new CountDownLatch(1);
        try {
            List<Future<AdmissionResult>> futures = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                String subject = participant.apply(i);
                futures.add(executor.submit(() -> {
                    start.await();
                    return seatStore.admit(eventId, subject);
                }));
            }
            start.countDown();
            List<AdmissionResult> results = new ArrayList<>();
            for (Future<AdmissionResult> future : futures) {
                results.add(future.get(60, TimeUnit.SECONDS));
            }
            return results;
        } finally {
            executor.shutdownNow();
        }
    }
}
