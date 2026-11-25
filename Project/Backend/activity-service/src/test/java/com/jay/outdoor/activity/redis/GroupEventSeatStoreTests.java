package com.jay.outdoor.activity.redis;

import com.jay.outdoor.activity.repository.GroupEventRepository;
import com.jay.outdoor.activity.support.AbstractIntegrationTest;
import com.jay.outdoor.activity.support.TestRedis;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class GroupEventSeatStoreTests extends AbstractIntegrationTest {

    @Autowired
    GroupEventSeatStore seatStore;

    @Test
    void takesThreeSeatsFromTen() {
        UUID eventId = UUID.randomUUID();

        seatStore.setRemainingSeats(eventId, 10);

        assertEquals(9L, seatStore.takeOneSeat(eventId));
        assertEquals(8L, seatStore.takeOneSeat(eventId));
        assertEquals(7L, seatStore.takeOneSeat(eventId));
        assertEquals(7L, seatStore.getRemainingSeats(eventId));
    }
}
