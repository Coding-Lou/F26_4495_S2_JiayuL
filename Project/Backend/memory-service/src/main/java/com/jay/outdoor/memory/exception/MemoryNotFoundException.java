package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class MemoryNotFoundException extends ApplicationException {

    public MemoryNotFoundException() {
        super(HttpStatus.NOT_FOUND, ErrorCode.MEMORY_NOT_FOUND, "Memory not found");
    }
}
