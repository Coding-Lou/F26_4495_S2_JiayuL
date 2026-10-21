package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class PhotoNotFoundException extends ApplicationException {

    public PhotoNotFoundException() {
        super(HttpStatus.NOT_FOUND, ErrorCode.PHOTO_NOT_FOUND, "Photo not found");
    }
}
