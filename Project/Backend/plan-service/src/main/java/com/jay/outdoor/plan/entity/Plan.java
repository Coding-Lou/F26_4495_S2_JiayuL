package com.jay.outdoor.plan.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * One user's confirmed intention to go on one trail on one date (spec section 6, D1).
 * Trail, owner, and date are immutable; no trail, weather, or gear data is stored.
 */
@Entity
@Table(name = "plans")
public class Plan {

    @Id
    private UUID id;

    @Column(name = "owner_subject", nullable = false, updatable = false)
    private String ownerSubject;

    @Column(name = "trail_id", nullable = false, updatable = false)
    private UUID trailId;

    @Column(name = "trip_date", nullable = false, updatable = false)
    private LocalDate tripDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private PlanStatus status = PlanStatus.READY;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(nullable = false)
    private boolean deleted = false;

    protected Plan() {
    }

    public Plan(String ownerSubject, UUID trailId, LocalDate tripDate) {
        this.ownerSubject = ownerSubject;
        this.trailId = trailId;
        this.tripDate = tripDate;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID();
        }

        OffsetDateTime now = now();
        if (createdAt == null) {
            createdAt = now;
        }
        if (updatedAt == null) {
            updatedAt = now;
        }
    }

    /** Soft delete (spec section 12.5). */
    public void markDeleted() {
        deleted = true;
        updatedAt = now();
    }

    // PostgreSQL keeps microseconds; truncating keeps responses stable across reads.
    private static OffsetDateTime now() {
        return OffsetDateTime.now().truncatedTo(ChronoUnit.MICROS);
    }

    public UUID getId() {
        return id;
    }

    public String getOwnerSubject() {
        return ownerSubject;
    }

    public UUID getTrailId() {
        return trailId;
    }

    public LocalDate getTripDate() {
        return tripDate;
    }

    public PlanStatus getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }

    public boolean isDeleted() {
        return deleted;
    }
}
