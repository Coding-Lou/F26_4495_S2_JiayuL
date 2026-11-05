package com.jay.outdoor.activity.exception;

public class TrailServiceUnavailableException extends RuntimeException {

    public TrailServiceUnavailableException() {
        super("Trail information is temporarily unavailable");
    }
}
