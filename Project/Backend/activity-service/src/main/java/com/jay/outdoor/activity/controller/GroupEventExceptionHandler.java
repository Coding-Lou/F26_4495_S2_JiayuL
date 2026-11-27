package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.exception.TrailNotFoundException;
import com.jay.outdoor.activity.exception.TrailServiceUnavailableException;
import com.jay.outdoor.activity.service.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.util.Map;

@RestControllerAdvice
public class GroupEventExceptionHandler {

    @ExceptionHandler(TrailNotFoundException.class)
    ResponseEntity<ProblemDetail> handleTrailNotFound(
            TrailNotFoundException ex,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(problem(HttpStatus.NOT_FOUND, ex.getMessage(), "TRAIL_NOT_FOUND", request));
    }

    @ExceptionHandler(TrailServiceUnavailableException.class)
    ResponseEntity<ProblemDetail> handleTrailUnavailable(
            TrailServiceUnavailableException ex,
            HttpServletRequest request
    ) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(problem(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(),
                        "TRAIL_SERVICE_UNAVAILABLE", request));
    }

    @ExceptionHandler(GroupEventValidationException.class)
    ResponseEntity<ProblemDetail> handleDomainValidation(
            GroupEventValidationException ex,
            HttpServletRequest request
    ) {
        ProblemDetail problem = validationProblem(request);
        problem.setProperty("errors", new Object[]{Map.of("field", ex.getField(), "message", ex.getMessage())});
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> handleRequestValidation(
            MethodArgumentNotValidException ex,
            HttpServletRequest request
    ) {
        ProblemDetail problem = validationProblem(request);
        problem.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
                .map(error -> Map.of(
                        "field", error.getField(),
                        "message", error.getDefaultMessage() == null
                                ? "Invalid value" : error.getDefaultMessage()))
                .toList());
        return ResponseEntity.badRequest().body(problem);
    }

    private static ProblemDetail validationProblem(HttpServletRequest request) {
        ProblemDetail problem = problem(HttpStatus.BAD_REQUEST,
                "Request validation failed", "VALIDATION_ERROR", request);
        problem.setTitle("Validation Failed");
        return problem;
    }

    private static ProblemDetail problem(
            HttpStatus status,
            String detail,
            String code,
            HttpServletRequest request
    ) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", code);
        return problem;
    }

    @ExceptionHandler(EventNotFoundException.class)
    ResponseEntity<ProblemDetail> handleEventNotFound(
            EventNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(problem(HttpStatus.NOT_FOUND, ex.getMessage(),
                        "EVENT_NOT_FOUND", request));
    }

    @ExceptionHandler(SeatCounterNotReadyException.class)
    ResponseEntity<ProblemDetail> handleSeatCounterNotReady(
            SeatCounterNotReadyException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(problem(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(),
                        "SEAT_COUNTER_NOT_READY", request));
    }

    @ExceptionHandler(RedisAdmissionUnavailableException.class)
    ResponseEntity<ProblemDetail> handleRedisAdmissionUnavailable(
            RedisAdmissionUnavailableException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(problem(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage(),
                        "REDIS_ADMISSION_UNAVAILABLE", request));
    }

    @ExceptionHandler(EventRegistrationException.class)
    ResponseEntity<ProblemDetail> handleJoinConflict(
            EventRegistrationException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(problem(HttpStatus.CONFLICT, ex.getMessage(),
                        ex.getReason().name(), request));
    }

    @ExceptionHandler(EventRegistrationValidationException.class)
    ResponseEntity<ProblemDetail> handleRegistrationValidation(
            EventRegistrationValidationException ex, HttpServletRequest request) {
        ProblemDetail problem = validationProblem(request);
        problem.setProperty("errors", new Object[]{Map.of("field", ex.getField(), "message", ex.getMessage())});
        return ResponseEntity.badRequest().body(problem);
    }

}
