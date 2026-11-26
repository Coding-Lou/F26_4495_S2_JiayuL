package com.jay.outdoor.activity.controller;

import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.dto.EventRegistrationResponse;
import com.jay.outdoor.activity.dto.GroupEventResponse;
import com.jay.outdoor.activity.service.EventRegistrationService;
import com.jay.outdoor.activity.service.GroupEventService;
import com.jay.outdoor.activity.service.JoinEventResult;
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
    public ResponseEntity<EventRegistrationResponse> join(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID eventId
    ) {
        String subject = validate(jwt);
        JoinEventResult result = eventRegistrationService.join(eventId, subject);
        HttpStatus status = result.created() ? HttpStatus.CREATED : HttpStatus.OK;
        return ResponseEntity.status(status)
                .body(EventRegistrationResponse.from(result.registration()));
    }

    @DeleteMapping("/{eventId}/registrations")
    public ResponseEntity<Void> cancel(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID eventId
    ) {
        eventRegistrationService.cancel(eventId, validate(jwt));
        return ResponseEntity.noContent().build();
    }

    private String validate(Jwt jwt) {
        String subject = jwt == null ? null : jwt.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "A valid user subject is required");
        }
        return subject;
    }
}
