package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class TrailServiceUnavailableException extends ApplicationException {

    public TrailServiceUnavailableException() {
        super(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.TRAIL_SERVICE_UNAVAILABLE, "Trail information is temporarily unavailable");
    }
}
