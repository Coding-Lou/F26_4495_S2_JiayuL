package com.jay.outdoor.user.exception;

public class ResourceNotFoundException extends ApplicationException {

    public ResourceNotFoundException(
            ErrorCode errorCode,
            String message
    ) {
        super(errorCode, message);
    }
}