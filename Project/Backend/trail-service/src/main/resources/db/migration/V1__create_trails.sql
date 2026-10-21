
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE trails (
                        id UUID PRIMARY KEY,

                        name VARCHAR(200) NOT NULL,
                        description TEXT,

                        difficulty VARCHAR(20) NOT NULL,
                        distance_km DOUBLE PRECISION NOT NULL,
                        elevation_gain_m INTEGER,
                        estimated_duration_min INTEGER,

                        trailhead GEOMETRY(Point, 4326) NOT NULL,
                        route GEOMETRY(Geometry, 4326),

                        source VARCHAR(100),

                        created_at TIMESTAMP WITH TIME ZONE
                            NOT NULL DEFAULT CURRENT_TIMESTAMP,

                        updated_at TIMESTAMP WITH TIME ZONE
                            NOT NULL DEFAULT CURRENT_TIMESTAMP,

                        deleted BOOLEAN NOT NULL DEFAULT FALSE,

                        CONSTRAINT chk_trail_difficulty
                            CHECK (difficulty IN ('EASY', 'MODERATE', 'HARD')),

                        CONSTRAINT chk_trail_distance
                            CHECK (distance_km >= 0)
);

CREATE INDEX idx_trails_trailhead_geography
    ON trails USING GIST ((trailhead::geography));

CREATE INDEX idx_trails_difficulty
    ON trails(difficulty)
    WHERE deleted = FALSE;