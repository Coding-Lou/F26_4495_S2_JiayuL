package com.jay.outdoor.recommendation.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(UnsafePromptException.class)
    public ProblemDetail handleUnsafePrompt(
            UnsafePromptException exception
    ) {

        ProblemDetail problem =
                ProblemDetail.forStatusAndDetail(
                        HttpStatus.BAD_REQUEST,
                        exception.getMessage()
                );

        problem.setTitle("Unsafe Prompt");

        return problem;
    }
}