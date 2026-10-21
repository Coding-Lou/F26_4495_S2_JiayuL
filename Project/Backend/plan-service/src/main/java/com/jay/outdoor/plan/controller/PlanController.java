package com.jay.outdoor.plan.controller;

import com.jay.outdoor.plan.dto.CreatePlanRequest;
import com.jay.outdoor.plan.dto.PlanPage;
import com.jay.outdoor.plan.dto.PlanResponse;
import com.jay.outdoor.plan.security.OwnerSubject;
import com.jay.outdoor.plan.service.CreatePlanResult;
import com.jay.outdoor.plan.service.PlanPaging;
import com.jay.outdoor.plan.service.PlanService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/** Owner Plan API (spec section 12). The owner is always the token's subject. */
@RestController
@RequestMapping("/api/plans")
public class PlanController {

    private final PlanService planService;

    public PlanController(PlanService planService) {
        this.planService = planService;
    }

    @GetMapping
    public PlanPage listOwnPlans(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "" + PlanPaging.DEFAULT_SIZE) int size
    ) {
        return planService.list(OwnerSubject.of(jwt), page, size);
    }

    /** 201 with a new Plan, or 200 with the caller's existing active Plan (D8). */
    @PostMapping
    public ResponseEntity<PlanResponse> createPlan(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreatePlanRequest request
    ) {
        CreatePlanResult result = planService.create(OwnerSubject.of(jwt), request);

        return ResponseEntity
                .status(result.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(result.plan());
    }

    @GetMapping("/{planId}")
    public PlanResponse getPlan(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId
    ) {
        return planService.get(OwnerSubject.of(jwt), planId);
    }

    @DeleteMapping("/{planId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePlan(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID planId
    ) {
        planService.delete(OwnerSubject.of(jwt), planId);
    }
}
