package com.jay.outdoor.plan.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;
import java.util.Map;

/**
 * ProblemDetail errors in the user-service style: {@code title}, {@code detail},
 * {@code instance}, {@code code}, and {@code errors[]} for validation.
 * Spring MVC's own exceptions (malformed JSON, type mismatch, missing parameter,
 * media type) are handled by the superclass and given a code here.
 * Copied from memory-service without its multipart handling.
 */
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApplicationException.class)
    public ResponseEntity<ProblemDetail> handleApplication(
            ApplicationException ex,
            HttpServletRequest request
    ) {
        ProblemDetail problem = problem(
                ex.getStatus(),
                titleFor(ex.getStatus(), ex.getErrorCode()),
                ex.getMessage(),
                ex.getErrorCode(),
                request
        );

        if (ex instanceof RequestValidationException validation) {
            problem.setProperty("errors", validation.getErrors().stream()
                    .map(error -> Map.of(
                            "field", error.field(),
                            "message", error.message()))
                    .toList());
        }

        return ResponseEntity.status(ex.getStatus()).body(problem);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ProblemDetail> handleConstraintViolation(
            ConstraintViolationException ex,
            HttpServletRequest request
    ) {
        ProblemDetail problem = problem(
                HttpStatus.BAD_REQUEST,
                "Validation Failed",
                "Request validation failed",
                ErrorCode.VALIDATION_ERROR,
                request
        );

        problem.setProperty("errors", ex.getConstraintViolations().stream()
                .map(violation -> Map.of(
                        "field", String.valueOf(violation.getPropertyPath()),
                        "message", violation.getMessage() != null
                                ? violation.getMessage()
                                : "Invalid value"))
                .toList());

        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(
            Exception ex,
            HttpServletRequest request
    ) {
        // Only the type is logged: messages of persistence and parsing errors can
        // contain request values (owner subjects), which are never logged.
        log.error("Unexpected {} while handling {} {}",
                ex.getClass().getName(),
                request.getMethod(),
                request.getRequestURI());

        ProblemDetail problem = problem(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal Server Error",
                "An unexpected error occurred",
                ErrorCode.INTERNAL_SERVER_ERROR,
                request
        );

        return ResponseEntity.internalServerError().body(problem);
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex,
            HttpHeaders headers,
            HttpStatusCode status,
            WebRequest request
    ) {
        ProblemDetail problem = ex.getBody();
        problem.setTitle("Validation Failed");
        problem.setDetail("Request validation failed");

        problem.setProperty("errors", ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> Map.of(
                        "field", error.getField(),
                        "message", error.getDefaultMessage() != null
                                ? error.getDefaultMessage()
                                : "Invalid value"))
                .toList());

        return handleExceptionInternal(ex, problem, headers, status, request);
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(
            Exception ex,
            Object body,
            HttpHeaders headers,
            HttpStatusCode statusCode,
            WebRequest request
    ) {
        ResponseEntity<Object> response =
                super.handleExceptionInternal(ex, body, headers, statusCode, request);

        if (response != null && response.getBody() instanceof ProblemDetail problem
                && (problem.getProperties() == null
                || !problem.getProperties().containsKey("code"))) {
            problem.setProperty("code", frameworkCode(ex, statusCode).name());
        }

        return response;
    }

    private static ErrorCode frameworkCode(Exception ex, HttpStatusCode status) {
        return switch (status.value()) {
            case 400 -> ErrorCode.VALIDATION_ERROR;
            case 404 -> ErrorCode.NOT_FOUND;
            case 405 -> ErrorCode.METHOD_NOT_ALLOWED;
            case 415 -> ErrorCode.UNSUPPORTED_MEDIA_TYPE;
            default -> status.is5xxServerError()
                    ? ErrorCode.INTERNAL_SERVER_ERROR
                    : ErrorCode.REQUEST_ERROR;
        };
    }

    private static String titleFor(HttpStatus status, ErrorCode code) {
        if (code == ErrorCode.VALIDATION_ERROR) {
            return "Validation Failed";
        }
        if (status == HttpStatus.NOT_FOUND) {
            return "Resource Not Found";
        }
        return status.getReasonPhrase();
    }

    private static ProblemDetail problem(
            HttpStatus status,
            String title,
            String detail,
            ErrorCode code,
            HttpServletRequest request
    ) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code.name());
        return problem;
    }
}
