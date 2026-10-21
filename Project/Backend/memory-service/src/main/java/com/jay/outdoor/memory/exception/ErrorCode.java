package com.jay.outdoor.memory.exception;

public enum ErrorCode {

    MEMORY_NOT_FOUND,
    PHOTO_NOT_FOUND,
    TRAIL_NOT_FOUND,
    PHOTO_LIMIT_REACHED,
    PAYLOAD_TOO_LARGE,
    IMAGE_TOO_LARGE,
    UNSUPPORTED_MEDIA_TYPE,
    TRAIL_SERVICE_UNAVAILABLE,
    STORAGE_UNAVAILABLE,
    VALIDATION_ERROR,
    AUTHENTICATION_REQUIRED,
    ACCESS_DENIED,
    INTERNAL_SERVER_ERROR,

    // Framework-level outcomes that no section 17 row names (unknown path,
    // wrong method, other client errors).
    NOT_FOUND,
    METHOD_NOT_ALLOWED,
    REQUEST_ERROR,
}
