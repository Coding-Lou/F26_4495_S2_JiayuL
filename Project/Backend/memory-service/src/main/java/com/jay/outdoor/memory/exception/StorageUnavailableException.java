package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class StorageUnavailableException extends ApplicationException {

    public StorageUnavailableException() {
        super(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.STORAGE_UNAVAILABLE, "Photo storage is temporarily unavailable");
    }
}
