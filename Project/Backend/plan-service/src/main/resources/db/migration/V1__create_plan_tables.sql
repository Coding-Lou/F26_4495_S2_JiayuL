CREATE TABLE plans (
    id             UUID PRIMARY KEY,
    owner_subject  VARCHAR(255) NOT NULL,
    trail_id       UUID NOT NULL,
    trip_date      DATE NOT NULL,
    status         VARCHAR(16) NOT NULL DEFAULT 'READY',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted        BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_plan_status CHECK (status IN ('READY'))
);

-- One active Plan per owner, trail, and date (D6). Soft-deleted rows do not count.
CREATE UNIQUE INDEX uk_plans_owner_trail_date_active
    ON plans (owner_subject, trail_id, trip_date)
    WHERE deleted = FALSE;

-- Owner list: WHERE owner_subject = ? AND deleted = false
--             ORDER BY trip_date ASC, created_at ASC, id ASC
CREATE INDEX idx_plans_owner_active
    ON plans (owner_subject, trip_date, created_at, id)
    WHERE deleted = FALSE;
