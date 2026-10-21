package com.jay.outdoor.plan.exception;

import org.springframework.http.HttpStatus;

/** A missing, deleted, or another user's Plan: indistinguishable on purpose (spec section 9). */
public class PlanNotFoundException extends ApplicationException {

    public PlanNotFoundException() {
        super(HttpStatus.NOT_FOUND, ErrorCode.PLAN_NOT_FOUND, "Plan not found");
    }
}
