package com.jay.outdoor.activity.service;

import java.util.UUID;

public class RedisAdmissionUnavailableException extends RuntimeException {
    public RedisAdmissionUnavailableException(UUID eventId, Throwable cause) {
        super("Redis admission is unavailable for event " + eventId, cause);
    }
}
