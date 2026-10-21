package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class UnsupportedImageException extends ApplicationException {

    public UnsupportedImageException() {
        super(HttpStatus.UNSUPPORTED_MEDIA_TYPE, ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Only still JPEG, PNG, and WebP images are accepted");
    }
}
