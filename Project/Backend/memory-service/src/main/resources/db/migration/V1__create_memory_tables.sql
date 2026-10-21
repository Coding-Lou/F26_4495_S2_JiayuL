CREATE TABLE memories (
    id             UUID PRIMARY KEY,
    owner_subject  VARCHAR(255) NOT NULL,
    trail_id       UUID NOT NULL,
    trip_date      DATE NOT NULL,
    title          VARCHAR(120) NOT NULL,
    story          VARCHAR(5000),
    visibility     VARCHAR(10) NOT NULL DEFAULT 'PRIVATE',
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted        BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT chk_memory_visibility
        CHECK (visibility IN ('PRIVATE', 'PUBLIC')),
    CONSTRAINT chk_memory_title_not_blank
        CHECK (char_length(btrim(title)) > 0)
);

-- Owner list: WHERE owner_subject = ? AND deleted = false
--             ORDER BY trip_date DESC, created_at DESC, id DESC
CREATE INDEX idx_memories_owner_active
    ON memories (owner_subject, trip_date DESC, created_at DESC, id DESC)
    WHERE deleted = FALSE;

-- Public trail list: WHERE trail_id = ? AND visibility = 'PUBLIC' AND deleted = false
CREATE INDEX idx_memories_trail_public
    ON memories (trail_id, trip_date DESC, created_at DESC, id DESC)
    WHERE deleted = FALSE AND visibility = 'PUBLIC';

CREATE TABLE memory_photos (
    id          UUID PRIMARY KEY,
    memory_id   UUID NOT NULL,
    object_key  VARCHAR(255) NOT NULL,
    media_type  VARCHAR(20) NOT NULL,
    position    INTEGER NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_memory_photos_memory
        FOREIGN KEY (memory_id) REFERENCES memories (id),
    CONSTRAINT uk_memory_photos_object_key UNIQUE (object_key),
    CONSTRAINT uk_memory_photos_position
        UNIQUE (memory_id, position) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT chk_memory_photos_position CHECK (position >= 0),
    CONSTRAINT chk_memory_photos_media_type
        CHECK (media_type IN ('image/jpeg', 'image/png'))
);
