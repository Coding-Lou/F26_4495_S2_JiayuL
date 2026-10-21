package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

/**
 * The trail does not exist or is deleted. 400 when a create request names it
 * (404 stays reserved for the addressed Memory); 404 on the public trail list.
 */
public class TrailNotFoundException extends ApplicationException {

    public TrailNotFoundException(HttpStatus status) {
        super(status, ErrorCode.TRAIL_NOT_FOUND, "Trail not found");
    }
}
