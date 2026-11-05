package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.dto.GroupEventResponse;
import com.jay.outdoor.activity.service.GroupEventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/group-events")
public class GroupEventController {

    private final GroupEventService service;

    public GroupEventController(GroupEventService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<GroupEventResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateGroupEventRequest request
    ) {
        String subject = jwt == null ? null : jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A valid user subject is required");
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GroupEventResponse.from(service.create(subject, request)));
    }
}
