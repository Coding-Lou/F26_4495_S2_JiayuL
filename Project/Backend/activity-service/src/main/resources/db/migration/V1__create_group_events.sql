CREATE TABLE group_events (
    id                 UUID PRIMARY KEY,
    organizer_subject  VARCHAR(255) NOT NULL,
    trail_id           UUID NOT NULL,
    title              VARCHAR(160) NOT NULL,
    description        TEXT,
    capacity           INTEGER NOT NULL,
    starts_at          TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at            TIMESTAMP WITH TIME ZONE NOT NULL,
    status             VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_group_events_capacity CHECK (capacity > 0),
    CONSTRAINT chk_group_events_time_range CHECK (ends_at > starts_at),
    CONSTRAINT chk_group_events_status CHECK (status IN ('OPEN', 'CANCELLED', 'COMPLETED'))
);

CREATE INDEX idx_group_events_trail_start
    ON group_events (trail_id, starts_at, id)
    WHERE status = 'OPEN';

CREATE INDEX idx_group_events_organizer_start
    ON group_events (organizer_subject, starts_at DESC, id);
