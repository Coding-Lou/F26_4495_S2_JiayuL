package com.jay.outdoor.plan.service;

import com.jay.outdoor.plan.dto.PlanResponse;

/** {@code created} is true for a new Plan (201) and false for the existing one (200). */
public record CreatePlanResult(PlanResponse plan, boolean created) {
}
