package com.jay.outdoor.activity.service;

public class EventRegistrationValidationException extends RuntimeException {
    private final String field;

    public EventRegistrationValidationException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
