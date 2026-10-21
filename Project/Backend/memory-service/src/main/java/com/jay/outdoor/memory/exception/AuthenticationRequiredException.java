package com.jay.outdoor.memory.exception;

import org.springframework.http.HttpStatus;

public class AuthenticationRequiredException extends ApplicationException {

    public AuthenticationRequiredException() {
        super(HttpStatus.UNAUTHORIZED, ErrorCode.AUTHENTICATION_REQUIRED, "Authentication is required to access this resource");
    }
}
