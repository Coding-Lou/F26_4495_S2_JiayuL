package com.jay.outdoor.activity.service;

public class GroupEventValidationException extends IllegalArgumentException {

    private final String field;

    public GroupEventValidationException(String field, String message) {
        super(message);
        this.field = field;
    }

    public String getField() {
        return field;
    }
}
