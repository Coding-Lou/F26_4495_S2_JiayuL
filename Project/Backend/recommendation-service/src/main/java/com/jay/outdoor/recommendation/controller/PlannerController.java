package com.jay.outdoor.recommendation.controller;

import com.jay.outdoor.recommendation.dto.PlannerTurnRequest;
import com.jay.outdoor.recommendation.dto.PlannerTurnResponse;
import com.jay.outdoor.recommendation.service.ConversationPlannerService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planner")
public class PlannerController {

    private final ConversationPlannerService plannerService;

    public PlannerController(ConversationPlannerService plannerService) {
        this.plannerService = plannerService;
    }

    @PostMapping("/turn")
    public PlannerTurnResponse handleTurn(
            @Valid @RequestBody PlannerTurnRequest request,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return plannerService.handleTurn(
                request,
                jwt.getTokenValue()
        );
    }
}
