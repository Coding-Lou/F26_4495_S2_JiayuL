package com.jay.outdoor.memory.entity;

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

@Entity
@Table(name = "memories")
public class Memory {

    @Id
    private UUID id;

    @Column(name = "owner_subject", nullable = false, updatable = false)
    private String ownerSubject;

    @Column(name = "trail_id", nullable = false, updatable = false)
    private UUID trailId;

    @Column(name = "trip_date", nullable = false)
    private LocalDate tripDate;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(length = 5000)
    private String story;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private MemoryVisibility visibility = MemoryVisibility.PRIVATE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(nullable = false)
    private boolean deleted = false;

    protected Memory() {
    }

    public Memory(String ownerSubject, UUID trailId) {
        this.ownerSubject = ownerSubject;
        this.trailId = trailId;
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

    /** Records a change to the Memory or to its photos. */
    public void markUpdated() {
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

    public void setTripDate(LocalDate tripDate) {
        this.tripDate = tripDate;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getStory() {
        return story;
    }

    public void setStory(String story) {
        this.story = story;
    }

    public MemoryVisibility getVisibility() {
        return visibility;
    }

    public void setVisibility(MemoryVisibility visibility) {
        this.visibility = visibility;
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

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }
}
