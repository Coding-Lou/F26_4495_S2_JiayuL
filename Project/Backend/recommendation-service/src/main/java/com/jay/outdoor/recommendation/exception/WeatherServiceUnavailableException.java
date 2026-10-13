package com.jay.outdoor.recommendation.exception;

public class WeatherServiceUnavailableException extends RuntimeException {

    public WeatherServiceUnavailableException(String message) {
        super(message);
    }

    public WeatherServiceUnavailableException(
            String message,
            Throwable cause
    ) {
        super(message, cause);
    }
}