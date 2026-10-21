package com.jay.outdoor.plan.exception;

import org.springframework.http.HttpStatus;

/**
 * The trail named by a create request does not exist or is deleted. 400, because
 * 404 stays reserved for the addressed Plan (spec section 11).
 */
public class TrailNotFoundException extends ApplicationException {

    public TrailNotFoundException() {
        super(HttpStatus.BAD_REQUEST, ErrorCode.TRAIL_NOT_FOUND, "Trail not found");
    }
}
