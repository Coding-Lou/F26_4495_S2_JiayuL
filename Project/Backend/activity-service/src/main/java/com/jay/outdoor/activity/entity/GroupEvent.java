package com.jay.outdoor.activity.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "group_events")
public class GroupEvent {

    @Id
    private UUID id;

    @Column(name = "organizer_subject", nullable = false, updatable = false, length = 255)
    private String organizerSubject;

    @Column(name = "trail_id", nullable = false, updatable = false)
    private UUID trailId;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(columnDefinition = "text")
    private String description;

    @Column(nullable = false)
    private int capacity;

    @Column(name = "seats_taken", nullable = false, updatable = false, insertable = false)
    private int seatsTaken = 0;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private GroupEventStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "registration_opens_at", nullable = false)
    private Instant registrationOpensAt;

    @Column(name = "registration_closes_at", nullable = false)
    private Instant registrationClosesAt;

    protected GroupEvent() {
        // Required by JPA.
    }

    public GroupEvent(
            String organizerSubject,
            UUID trailId,
            String title,
            String description,
            int capacity,
            int seatsTaken,
            Instant registrationOpensAt,
            Instant registrationClosesAt,
            Instant startsAt,
            Instant endsAt,
            Instant now
    ) {
        if (organizerSubject == null || organizerSubject.isBlank()) {
            throw new IllegalArgumentException("organizerSubject is required");
        }
        if (title == null || title.isBlank() || title.length() > 160) {
            throw new IllegalArgumentException("title must have 1 to 160 characters");
        }
        if (capacity <= 0) {
            throw new IllegalArgumentException("capacity must be positive");
        }
        Objects.requireNonNull(startsAt, "startsAt");
        Objects.requireNonNull(endsAt, "endsAt");
        if (!endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("endsAt must be after startsAt");
        }

        this.id = UUID.randomUUID();
        this.organizerSubject = organizerSubject;
        this.trailId = Objects.requireNonNull(trailId, "trailId");
        this.title = title;
        this.description = description;
        this.capacity = capacity;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.status = GroupEventStatus.OPEN;
        this.createdAt = Objects.requireNonNull(now, "now").truncatedTo(ChronoUnit.MICROS);
        this.updatedAt = createdAt;
        this.seatsTaken = seatsTaken;
        this.registrationOpensAt = registrationOpensAt;
        this.registrationClosesAt = registrationClosesAt;
    }

    public UUID getId() {
        return id;
    }

    public String getOrganizerSubject() {
        return organizerSubject;
    }

    public UUID getTrailId() {
        return trailId;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public int getCapacity() {
        return capacity;
    }

    public int getSeatsTaken() {
        return seatsTaken;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public GroupEventStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getRegistrationOpensAt() {
        return registrationOpensAt;
    }

    public Instant getRegistrationClosesAt() {
        return registrationClosesAt;
    }

    public void setDescription(String description) {
        this.description = description;
    }
}
