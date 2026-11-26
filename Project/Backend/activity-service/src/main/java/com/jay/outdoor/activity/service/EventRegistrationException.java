package com.jay.outdoor.activity.service;

public class EventRegistrationException extends RuntimeException {
    private final EventJoinReason reason;

    public EventRegistrationException(EventJoinReason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public EventJoinReason getReason() {
        return this.reason;
    }
}
