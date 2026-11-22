ALTER TABLE group_events
    ADD COLUMN seats_taken              INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN registration_opens_at    TIMESTAMP WITH TIME ZONE,
    ADD COLUMN registration_closes_at     TIMESTAMP WITH TIME ZONE;

UPDATE group_events
    SET  registration_opens_at = created_at,
         registration_closes_at = starts_at;

ALTER TABLE group_events
    ALTER COLUMN registration_opens_at  SET NOT NULL ,
    ALTER COLUMN registration_closes_at   SET NOT NULL ,
    ADD CONSTRAINT chk_group_events_seats_taken
          CHECK (seats_taken >= 0 AND seats_taken <= capacity),
    ADD CONSTRAINT chk_group_events_registration_window
          CHECK (
                registration_opens_at < registration_closes_at
            AND registration_closes_at <= starts_at
          );


CREATE TABLE event_registrations (
    id                      UUID PRIMARY KEY ,
    participant_subject     VARCHAR(255) NOT NULL,
    event_id                UUID NOT NULL ,
    status                  VARCHAR(16) NOT NULL,
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_registrations_event
        FOREIGN KEY (event_id) REFERENCES group_events(id),

    CONSTRAINT chk_event_registrations
        CHECK (status IN ('CONFIRMED', 'CANCELLED', 'WAITLISTED', 'PENDING', 'FAILED', 'REVIEW'))
);

CREATE UNIQUE INDEX idx_event_registrations
    ON event_registrations (event_id, participant_subject)
    WHERE status in ('CONFIRMED', 'PENDING', 'WAITLISTED');

CREATE INDEX idx_event_registrations_participant_created_at
    ON event_registrations (participant_subject, created_at DESC);
