package com.jay.outdoor.plan.exception;

import org.springframework.http.HttpStatus;

import java.util.List;

/** A request rule checked in the service; rendered like Bean Validation errors. */
public class RequestValidationException extends ApplicationException {

    public record FieldError(String field, String message) {
    }

    private final List<FieldError> errors;

    public RequestValidationException(List<FieldError> errors) {
        super(HttpStatus.BAD_REQUEST, ErrorCode.VALIDATION_ERROR, "Request validation failed");
        this.errors = List.copyOf(errors);
    }

    public RequestValidationException(String field, String message) {
        this(List.of(new FieldError(field, message)));
    }

    public List<FieldError> getErrors() {
        return errors;
    }
}
