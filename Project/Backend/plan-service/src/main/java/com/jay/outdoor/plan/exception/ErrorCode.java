package com.jay.outdoor.plan.exception;

/** The codes of spec section 12.7, and only those. */
public enum ErrorCode {

    PLAN_NOT_FOUND,
    TRAIL_NOT_FOUND,
    TRAIL_SERVICE_UNAVAILABLE,
    VALIDATION_ERROR,
    AUTHENTICATION_REQUIRED,
    ACCESS_DENIED,
    INTERNAL_SERVER_ERROR,

    // Framework-level outcomes (unknown path, wrong method, wrong media type,
    // other client errors).
    NOT_FOUND,
    METHOD_NOT_ALLOWED,
    UNSUPPORTED_MEDIA_TYPE,
    REQUEST_ERROR,
}
