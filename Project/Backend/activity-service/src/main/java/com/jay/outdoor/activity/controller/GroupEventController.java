package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.dto.GroupEventResponse;
import com.jay.outdoor.activity.dto.MyRegistrationStatusResponse;
import com.jay.outdoor.activity.service.EventRegistrationService;
import com.jay.outdoor.activity.service.GroupEventService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/group-events")
public class GroupEventController {

    private final GroupEventService groupEventService;
    private final EventRegistrationService eventRegistrationService;

    public GroupEventController(
            GroupEventService groupEventService,
            EventRegistrationService eventRegistrationService
    ) {
        this.groupEventService = groupEventService;
        this.eventRegistrationService = eventRegistrationService;
    }


    @PostMapping
    public ResponseEntity<GroupEventResponse> create(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody CreateGroupEventRequest request
    ) {
        String subject = validate(jwt);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GroupEventResponse.from(groupEventService.create(subject, request)));
    }

    @PostMapping("/{eventId}/registrations")
    public ResponseEntity<MyRegistrationStatusResponse> join(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID eventId
    ) {
        String subject = validate(jwt);
        MyRegistrationStatusResponse result = eventRegistrationService.join(eventId, subject);
        HttpStatus status = result.status() == MyRegistrationStatusResponse.Status.QUEUED
                ? HttpStatus.ACCEPTED : HttpStatus.OK;
        return ResponseEntity.status(status).body(result);
    }

    @DeleteMapping("/{eventId}/registrations")
    public ResponseEntity<Void> cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID eventId
    ) {
        eventRegistrationService.cancel(eventId, validate(jwt));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{eventId}/registrations/me")
    public ResponseEntity<MyRegistrationStatusResponse> getMyRegistrationStatus(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID eventId
    ) {
        String subject = validate(jwt);
        return ResponseEntity.ok(eventRegistrationService.getMyRegistrationStatus(eventId, subject));
    }

    private String validate(Jwt jwt) {
        String subject = jwt == null ? null : jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A valid user subject is required");
        }
        return subject;
    }
}
