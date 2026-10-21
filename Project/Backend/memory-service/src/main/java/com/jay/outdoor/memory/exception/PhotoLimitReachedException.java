package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class PhotoLimitReachedException extends ApplicationException {

    public PhotoLimitReachedException() {
        super(HttpStatus.CONFLICT, ErrorCode.PHOTO_LIMIT_REACHED, "A memory can have at most 5 photos");
    }
}
