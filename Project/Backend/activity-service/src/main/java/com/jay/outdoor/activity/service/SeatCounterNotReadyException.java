package com.jay.outdoor.activity.service;

import java.util.UUID;

public class SeatCounterNotReadyException extends RuntimeException {
    public SeatCounterNotReadyException(UUID eventId) {
        super("Seat counter is not ready for event " + eventId);
    }
}
