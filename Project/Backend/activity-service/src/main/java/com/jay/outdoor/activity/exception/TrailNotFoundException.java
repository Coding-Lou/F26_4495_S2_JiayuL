package com.jay.outdoor.activity.exception;

public class TrailNotFoundException extends RuntimeException {

    public TrailNotFoundException() {
        super("Trail not found");
    }
}
