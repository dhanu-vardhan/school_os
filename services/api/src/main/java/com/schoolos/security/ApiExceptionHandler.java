package com.schoolos.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/** Turns policy failures into stable, non-leaky API responses. */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(StepUpRequiredException.class)
    public ResponseEntity<Map<String, Object>> stepUpRequired(StepUpRequiredException ignored) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "step_up_required", "message", "Fresh MFA verification required"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, Object>> forbidden(AccessDeniedException ignored) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "forbidden"));
    }
}
