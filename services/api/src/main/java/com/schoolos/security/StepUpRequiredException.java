package com.schoolos.security;

/** Thrown when a sensitive permission needs a fresh MFA step-up. Mapped to 403 step_up_required. */
public class StepUpRequiredException extends RuntimeException {
    public StepUpRequiredException() {
        super("Step-up authentication required");
    }
}
