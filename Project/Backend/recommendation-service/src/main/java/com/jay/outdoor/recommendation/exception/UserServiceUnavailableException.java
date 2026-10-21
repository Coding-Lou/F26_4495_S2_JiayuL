package com.jay.outdoor.recommendation.exception;

public class UserServiceUnavailableException extends RuntimeException {

    public UserServiceUnavailableException(
            String message,
            Throwable cause
    ) {
        super(message, cause);
    }
}