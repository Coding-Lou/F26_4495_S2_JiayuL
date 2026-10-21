-- Catalog visibility: whether a trail belongs to the curated public catalog
-- (GET /api/trails, and so Discover and the Daily Trail Activity list).
-- It is not deletion, privacy, or planner eligibility: nearby search and the
-- lookup by id ignore it. Existing trails stay in the catalog.
ALTER TABLE trails
    ADD COLUMN discover_visible BOOLEAN NOT NULL DEFAULT TRUE;
