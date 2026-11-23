package com.jay.outdoor.activity.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "event_registrations")
public class EventRegistration {
    @Id
    private UUID id;

    @Column(name = "participant_subject", nullable = false, updatable = false)
    private String participantSubject;

    @Column(name = "event_id" , nullable = false,  updatable = false)
    private UUID eventId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private RegistrationStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected EventRegistration() {}

    public EventRegistration(String participantSubject, UUID eventId, Instant now) {

        if (participantSubject == null || participantSubject.isEmpty()) {
            throw new IllegalArgumentException("participantSubject cannot be null or empty");
        }

        if  (eventId == null) {
            throw new IllegalArgumentException("eventId cannot be null");
        }

        this.id = UUID.randomUUID();
        this.participantSubject = participantSubject;
        this.eventId = eventId;
        this.status = RegistrationStatus.PENDING;
        this.createdAt = Objects.requireNonNull(now, "now").truncatedTo(ChronoUnit.MICROS);
        this.updatedAt = createdAt;
    }

    public void confirm(Instant now) {
        if (this.status != RegistrationStatus.PENDING) {
            throw new IllegalStateException("Cannot confirm registration");
        }
        this.status = RegistrationStatus.CONFIRMED;
        this.updatedAt = now;
    }

    public UUID getId() {
        return id;
    }

    public String getParticipantSubject() {
        return participantSubject;
    }

    public UUID getEventId() {
        return eventId;
    }

    public RegistrationStatus getStatus() {
        return status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
