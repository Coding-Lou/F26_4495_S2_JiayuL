package com.jay.outdoor.activity.service;

import com.jay.outdoor.activity.client.TrailCatalogClient;
import com.jay.outdoor.activity.dto.CreateGroupEventRequest;
import com.jay.outdoor.activity.entity.GroupEvent;
import com.jay.outdoor.activity.exception.TrailNotFoundException;
import com.jay.outdoor.activity.redis.GroupEventSeatStore;
import com.jay.outdoor.activity.repository.GroupEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

@Service
public class GroupEventService {

    private final GroupEventRepository repository;
    private final Clock clock;
    private final TrailCatalogClient trailCatalogClient;
    private static final Logger log = LoggerFactory.getLogger(GroupEventService.class);

    private final GroupEventSeatStore seatStore;

    public GroupEventService(
            GroupEventRepository repository,
            Clock clock,
            TrailCatalogClient trailCatalogClient, GroupEventSeatStore seatStore
    ) {
        this.repository = repository;
        this.clock = clock;
        this.trailCatalogClient = trailCatalogClient;
        this.seatStore = seatStore;
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

        if (request.registrationClosesAt() == null || request.registrationClosesAt().isAfter(request.startsAt())) {
            throw new GroupEventValidationException("registrationClosesAt", "must be before the event start date");
        }

        if (request.registrationOpensAt() == null ||  !request.registrationOpensAt().isBefore(request.registrationClosesAt())) {
            throw new GroupEventValidationException("registrationOpensAt", "must be before the registration closes date");
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
                request.registrationOpensAt(),
                request.registrationClosesAt(),
                request.startsAt(),
                request.endsAt(),
                now
        );

        GroupEvent saved = repository.save(event);

        try {
            seatStore.setRemainingSeats(saved.getId(), saved.getCapacity());
        } catch (DataAccessException e) {
            log.warn("Failed to load Redis seat counter for event {}", saved.getId(), e);
        }

        return saved;
    }


}
