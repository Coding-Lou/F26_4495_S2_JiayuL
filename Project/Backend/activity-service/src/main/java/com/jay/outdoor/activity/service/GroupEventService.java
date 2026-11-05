package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.client.TrailCatalogClient;
import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.exception.TrailNotFoundException;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

@Service
public class GroupEventService {

    private final GroupEventRepository repository;
    private final Clock clock;
    private final TrailCatalogClient trailCatalogClient;

    public GroupEventService(
            GroupEventRepository repository,
            Clock clock,
            TrailCatalogClient trailCatalogClient
    ) {
        this.repository = repository;
        this.clock = clock;
        this.trailCatalogClient = trailCatalogClient;
    }

    public GroupEvent create(String organizerSubject, CreateGroupEventRequest request) {
        Objects.requireNonNull(request, "request");
        Instant now = clock.instant();
        if (request.startsAt() == null || !request.startsAt().isAfter(now)) {
            throw new GroupEventValidationException("startsAt", "must be in the future");
        }
        if (request.endsAt() == null || !request.endsAt().isAfter(request.startsAt())) {
            throw new GroupEventValidationException("endsAt", "must be after startsAt");
        }
        if (!trailCatalogClient.trailExists(request.trailId())) {
            throw new TrailNotFoundException();
        }

        GroupEvent event = new GroupEvent(
                organizerSubject,
                request.trailId(),
                request.title(),
                request.description(),
                request.capacity(),
                request.startsAt(),
                request.endsAt(),
                now
        );
        return repository.save(event);
    }
}
