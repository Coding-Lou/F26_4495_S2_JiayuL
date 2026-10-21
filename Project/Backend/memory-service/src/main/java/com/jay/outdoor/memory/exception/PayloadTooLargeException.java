package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class PayloadTooLargeException extends ApplicationException {

    public PayloadTooLargeException() {
        super(HttpStatus.CONTENT_TOO_LARGE, ErrorCode.PAYLOAD_TOO_LARGE, "The file is larger than 10 MB");
    }
}
