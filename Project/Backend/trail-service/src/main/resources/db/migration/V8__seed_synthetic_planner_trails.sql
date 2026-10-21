-- Synthetic planner candidates: 400 generated sample trails that make the
-- planner's constraint space dense (difficulty x distance x elevation x
-- duration x scenery) around Southwest BC.
--
-- They are NOT real trails: source = 'SYNTHETIC_DEMO', every description
-- starts with "Generated sample route, not a verified trail.", and
-- discover_visible = false keeps them out of the curated catalog
-- (GET /api/trails, Discover). Nearby search and lookup by id include them.
--
-- Deterministic: no random(). Every varying value comes from md5 of the row
-- number and a fixed salt, so two clean databases get the same rows and ids.
--   * Difficulty: slot (n - 1) mod 40 -> 13 EASY, 18 MODERATE, 9 HARD, so
--     exactly 130 / 180 / 90.
--   * Region: a fixed quota per difficulty (no HARD trail in a lowland
--     region), filled in md5 order; centre plus a bounded offset on land.
--   * Distance: a difficulty-weighted band, then a position in the band.
--   * Elevation gain: distance x a difficulty climb rate, with difficulty
--     floors and caps and a regional relief cap.
--   * Duration: distance x pace + 1 minute per 10 m of gain, to 5 minutes.
--   * Scenery: a difficulty-weighted profile; OCEAN only near the coast,
--     MOUNTAIN only in mountain regions.
--   * Names: adjective + scenery feature + route term, unique by construction.

CREATE TEMPORARY TABLE synthetic_trail_seed ON COMMIT DROP AS
WITH
regions (region, centre_lat, centre_lon, lat_span, lon_span,
         coastal, mountain, max_gain_m) AS (
    VALUES
        ('north_shore',    49.375, -123.080, 0.028, 0.100, TRUE,  TRUE,  1800),
        ('burnaby',        49.250, -122.850, 0.028, 0.075, FALSE, FALSE,  400),
        ('coquitlam',      49.310, -122.765, 0.028, 0.035, FALSE, TRUE,  1800),
        ('surrey_delta',   49.120, -122.850, 0.025, 0.070, FALSE, FALSE,  150),
        ('sea_to_sky',     49.515, -123.170, 0.050, 0.040, TRUE,  TRUE,  1800),
        ('maple_ridge',    49.255, -122.530, 0.033, 0.070, FALSE, TRUE,  1800),
        ('squamish',       49.720, -123.080, 0.040, 0.050, TRUE,  TRUE,  1800),
        ('whistler',       50.100, -122.950, 0.050, 0.060, FALSE, TRUE,  1800),
        ('chilliwack',     49.100, -121.850, 0.050, 0.120, FALSE, TRUE,  1800),
        ('mission',        49.200, -122.270, 0.040, 0.070, FALSE, FALSE,  600),
        ('sunshine_coast', 49.480, -123.620, 0.025, 0.070, TRUE,  TRUE,  1800)
),
region_quota (difficulty, region, quota) AS (
    VALUES
        ('EASY', 'north_shore', 25), ('EASY', 'burnaby', 20),
        ('EASY', 'coquitlam', 10), ('EASY', 'surrey_delta', 20),
        ('EASY', 'sea_to_sky', 10), ('EASY', 'maple_ridge', 10),
        ('EASY', 'squamish', 10), ('EASY', 'whistler', 7),
        ('EASY', 'chilliwack', 7), ('EASY', 'mission', 6),
        ('EASY', 'sunshine_coast', 5),

        ('MODERATE', 'north_shore', 35), ('MODERATE', 'burnaby', 15),
        ('MODERATE', 'coquitlam', 15), ('MODERATE', 'surrey_delta', 10),
        ('MODERATE', 'sea_to_sky', 18), ('MODERATE', 'maple_ridge', 15),
        ('MODERATE', 'squamish', 18), ('MODERATE', 'whistler', 15),
        ('MODERATE', 'chilliwack', 14), ('MODERATE', 'mission', 12),
        ('MODERATE', 'sunshine_coast', 13),

        ('HARD', 'north_shore', 22), ('HARD', 'coquitlam', 8),
        ('HARD', 'sea_to_sky', 15), ('HARD', 'maple_ridge', 8),
        ('HARD', 'squamish', 12), ('HARD', 'whistler', 10),
        ('HARD', 'chilliwack', 10), ('HARD', 'sunshine_coast', 5)
),
region_slots AS (
    SELECT difficulty, region,
           SUM(quota) OVER (PARTITION BY difficulty ORDER BY region) - quota
               AS first_rank_exclusive,
           SUM(quota) OVER (PARTITION BY difficulty ORDER BY region)
               AS last_rank
    FROM region_quota
),
-- Weighted scenery profiles per difficulty; a repeated profile weighs more.
profiles (difficulty, profile_no, scenery) AS (
    VALUES
        ('EASY',  1, ARRAY['FOREST']),
        ('EASY',  2, ARRAY['FOREST']),
        ('EASY',  3, ARRAY['FOREST', 'LAKE']),
        ('EASY',  4, ARRAY['FOREST', 'LAKE']),
        ('EASY',  5, ARRAY['LAKE']),
        ('EASY',  6, ARRAY['LAKE', 'VIEWPOINT']),
        ('EASY',  7, ARRAY['FOREST', 'VIEWPOINT']),
        ('EASY',  8, ARRAY['FOREST', 'VIEWPOINT']),
        ('EASY',  9, ARRAY['VIEWPOINT']),
        ('EASY', 10, ARRAY['WATERFALL', 'FOREST']),
        ('EASY', 11, ARRAY['WATERFALL', 'FOREST']),
        ('EASY', 12, ARRAY['WATERFALL']),
        ('EASY', 13, ARRAY['OCEAN', 'FOREST']),
        ('EASY', 14, ARRAY['OCEAN', 'VIEWPOINT']),
        ('EASY', 15, ARRAY['FOREST', 'LAKE', 'VIEWPOINT']),
        ('EASY', 16, ARRAY['WATERFALL', 'FOREST', 'VIEWPOINT']),
        ('EASY', 17, ARRAY['LAKE', 'FOREST']),
        ('EASY', 18, ARRAY['FOREST']),
        ('EASY', 19, ARRAY['LAKE']),
        ('EASY', 20, ARRAY['OCEAN', 'FOREST', 'VIEWPOINT']),

        ('MODERATE',  1, ARRAY['FOREST', 'LAKE']),
        ('MODERATE',  2, ARRAY['LAKE', 'FOREST']),
        ('MODERATE',  3, ARRAY['FOREST', 'VIEWPOINT']),
        ('MODERATE',  4, ARRAY['VIEWPOINT', 'FOREST']),
        ('MODERATE',  5, ARRAY['WATERFALL', 'FOREST']),
        ('MODERATE',  6, ARRAY['WATERFALL', 'FOREST']),
        ('MODERATE',  7, ARRAY['LAKE', 'VIEWPOINT']),
        ('MODERATE',  8, ARRAY['MOUNTAIN', 'VIEWPOINT']),
        ('MODERATE',  9, ARRAY['MOUNTAIN', 'VIEWPOINT']),
        ('MODERATE', 10, ARRAY['MOUNTAIN', 'LAKE']),
        ('MODERATE', 11, ARRAY['FOREST', 'LAKE', 'VIEWPOINT']),
        ('MODERATE', 12, ARRAY['FOREST']),
        ('MODERATE', 13, ARRAY['LAKE']),
        ('MODERATE', 14, ARRAY['WATERFALL']),
        ('MODERATE', 15, ARRAY['VIEWPOINT']),
        ('MODERATE', 16, ARRAY['OCEAN', 'FOREST']),
        ('MODERATE', 17, ARRAY['OCEAN', 'VIEWPOINT']),
        ('MODERATE', 18, ARRAY['MOUNTAIN', 'FOREST']),
        ('MODERATE', 19, ARRAY['WATERFALL', 'FOREST', 'VIEWPOINT']),
        ('MODERATE', 20, ARRAY['MOUNTAIN', 'FOREST', 'LAKE']),

        ('HARD',  1, ARRAY['MOUNTAIN', 'VIEWPOINT']),
        ('HARD',  2, ARRAY['MOUNTAIN', 'VIEWPOINT']),
        ('HARD',  3, ARRAY['MOUNTAIN', 'VIEWPOINT']),
        ('HARD',  4, ARRAY['MOUNTAIN', 'VIEWPOINT']),
        ('HARD',  5, ARRAY['MOUNTAIN', 'LAKE']),
        ('HARD',  6, ARRAY['LAKE', 'MOUNTAIN']),
        ('HARD',  7, ARRAY['MOUNTAIN', 'VIEWPOINT', 'LAKE']),
        ('HARD',  8, ARRAY['LAKE', 'MOUNTAIN', 'VIEWPOINT']),
        ('HARD',  9, ARRAY['MOUNTAIN', 'FOREST']),
        ('HARD', 10, ARRAY['FOREST', 'MOUNTAIN']),
        ('HARD', 11, ARRAY['MOUNTAIN']),
        ('HARD', 12, ARRAY['VIEWPOINT', 'FOREST']),
        ('HARD', 13, ARRAY['WATERFALL', 'FOREST', 'VIEWPOINT']),
        ('HARD', 14, ARRAY['LAKE', 'FOREST']),
        ('HARD', 15, ARRAY['OCEAN', 'VIEWPOINT', 'MOUNTAIN']),
        ('HARD', 16, ARRAY['VIEWPOINT', 'FOREST'])
),
profile_counts AS (
    SELECT difficulty, COUNT(*) AS profile_total
    FROM profiles
    GROUP BY difficulty
),
-- u[k]: twelve independent uniforms in [0, 1) per row, from md5.
--   1 distance band   2 position in band   3 climb rate   4 gain cap
--   5 pace            6 scenery profile    7 latitude     8 longitude
--   9-11 gear variation                    12 region order
base AS (
    SELECT g.n,
           CASE
               WHEN (g.n - 1) % 40 < 13 THEN 'EASY'
               WHEN (g.n - 1) % 40 < 31 THEN 'MODERATE'
               ELSE 'HARD'
           END AS difficulty,
           h.u
    FROM generate_series(1, 400) AS g(n)
    CROSS JOIN LATERAL (
        SELECT array_agg(
                   ('x' || substr(md5('synthetic-demo:' || g.n || ':' || k), 1, 8))
                       ::bit(32)::bigint / 4294967296.0
                   ORDER BY k
               ) AS u
        FROM generate_series(1, 12) AS k
    ) AS h
),
ranked AS (
    SELECT b.*,
           ROW_NUMBER() OVER (
               PARTITION BY b.difficulty ORDER BY md5('synthetic-region:' || b.n) COLLATE "C"
           ) AS region_rank
    FROM base b
),
placed AS (
    SELECT r.n, r.difficulty, r.u, s.region,
           g.coastal, g.mountain, g.max_gain_m,
           ROUND((g.centre_lat + (r.u[7] * 2 - 1) * g.lat_span)::numeric, 5)
               AS latitude,
           ROUND((g.centre_lon + (r.u[8] * 2 - 1) * g.lon_span)::numeric, 5)
               AS longitude
    FROM ranked r
    JOIN region_slots s
      ON s.difficulty = r.difficulty
     AND r.region_rank > s.first_rank_exclusive
     AND r.region_rank <= s.last_rank
    JOIN regions g ON g.region = s.region
),
banded AS (
    SELECT p.*,
           band.lo_km, band.hi_km
    FROM placed p
    CROSS JOIN LATERAL (
        SELECT CASE
                   WHEN p.difficulty = 'EASY' THEN
                       CASE WHEN p.u[1] < 0.40 THEN ARRAY[2.0, 5.0]
                            WHEN p.u[1] < 0.75 THEN ARRAY[5.0, 8.0]
                            WHEN p.u[1] < 0.95 THEN ARRAY[8.0, 12.0]
                            ELSE ARRAY[12.0, 15.0] END
                   WHEN p.difficulty = 'MODERATE' THEN
                       CASE WHEN p.u[1] < 0.08 THEN ARRAY[3.0, 5.0]
                            WHEN p.u[1] < 0.33 THEN ARRAY[5.0, 8.0]
                            WHEN p.u[1] < 0.63 THEN ARRAY[8.0, 12.0]
                            WHEN p.u[1] < 0.85 THEN ARRAY[12.0, 16.0]
                            WHEN p.u[1] < 0.96 THEN ARRAY[16.0, 22.0]
                            ELSE ARRAY[22.0, 27.0] END
                   ELSE
                       CASE WHEN p.u[1] < 0.06 THEN ARRAY[2.5, 5.0]
                            WHEN p.u[1] < 0.16 THEN ARRAY[5.0, 8.0]
                            WHEN p.u[1] < 0.36 THEN ARRAY[8.0, 12.0]
                            WHEN p.u[1] < 0.58 THEN ARRAY[12.0, 16.0]
                            WHEN p.u[1] < 0.82 THEN ARRAY[16.0, 22.0]
                            ELSE ARRAY[22.0, 28.0] END
               END AS bounds
    ) AS b
    CROSS JOIN LATERAL (SELECT b.bounds[1] AS lo_km, b.bounds[2] AS hi_km) AS band
),
measured AS (
    SELECT x.*,
           ROUND((x.lo_km + x.u[2] * (x.hi_km - x.lo_km))::numeric, 1)
               AS distance_km
    FROM banded x
),
climbed AS (
    SELECT m.*,
           (ROUND(
               GREATEST(
                   CASE m.difficulty WHEN 'EASY' THEN 20
                                     WHEN 'MODERATE' THEN 150
                                     ELSE 500 END,
                   LEAST(
                       m.max_gain_m,
                       m.distance_km * CASE m.difficulty
                           WHEN 'EASY' THEN 8 + m.u[3] * 37
                           WHEN 'MODERATE' THEN 35 + m.u[3] * 60
                           ELSE 75 + m.u[3] * 155 END,
                       CASE m.difficulty
                           WHEN 'EASY' THEN 320 + m.u[4] * 80
                           WHEN 'MODERATE' THEN 750 + m.u[4] * 150
                           ELSE 1500 + m.u[4] * 300 END
                   )
               ) / 5.0
           ) * 5)::integer AS elevation_gain_m
    FROM measured m
),
timed AS (
    SELECT c.*,
           GREATEST(
               30,
               (ROUND(
                   (c.distance_km * CASE c.difficulty
                                        WHEN 'EASY' THEN 14 + c.u[5] * 3
                                        ELSE 13 + c.u[5] * 3 END
                    + c.elevation_gain_m / 10.0) / 5.0
               ) * 5)::integer
           ) AS estimated_duration_min
    FROM climbed c
),
scenic AS (
    SELECT t.*,
           -- Inland: OCEAN becomes FOREST. Lowland: MOUNTAIN becomes VIEWPOINT.
           -- Duplicates are removed, keeping the first occurrence's order.
           ARRAY(
               SELECT mapped
               FROM (
                   SELECT CASE
                              WHEN s.value = 'OCEAN' AND NOT t.coastal THEN 'FOREST'
                              WHEN s.value = 'MOUNTAIN' AND NOT t.mountain THEN 'VIEWPOINT'
                              ELSE s.value
                          END AS mapped,
                          s.ordinal
                   FROM unnest(pr.scenery) WITH ORDINALITY AS s(value, ordinal)
               ) AS m
               GROUP BY mapped
               ORDER BY MIN(m.ordinal)
           ) AS scenery
    FROM timed t
    JOIN profile_counts pc ON pc.difficulty = t.difficulty
    JOIN profiles pr
      ON pr.difficulty = t.difficulty
     AND pr.profile_no = 1 + FLOOR(t.u[6] * pc.profile_total)::integer
),
named AS (
    SELECT sc.*,
           ROW_NUMBER() OVER (
               PARTITION BY sc.scenery[1] ORDER BY sc.n
           ) AS name_rank
    FROM scenic sc
),
-- (name_rank - 1) * 37 mod 450 is a bijection on 0..449 (37 is coprime to
-- 450), so names are unique within a primary scenery; feature words differ
-- between sceneries, so they are unique overall (each group has < 450 rows).
composed AS (
    SELECT nm.*,
           ((nm.name_rank - 1) * 37) % 450 AS combo
    FROM named nm
)
SELECT
    md5('synthetic-demo-trail:' || c.n)::uuid AS id,
    c.n,
    c.region,
    c.difficulty,
    c.distance_km::double precision AS distance_km,
    c.elevation_gain_m,
    c.estimated_duration_min,
    c.latitude::double precision AS latitude,
    c.longitude::double precision AS longitude,
    c.scenery,
    c.u,
    (ARRAY['Cedar', 'Hemlock', 'Fern', 'Moss', 'Silver', 'Misty', 'Granite',
           'Alder', 'Raven', 'Eagle', 'Salal', 'Bluebell', 'Juniper',
           'Kestrel', 'Larch', 'Osprey', 'Huckleberry', 'Willow', 'Spruce',
           'Fir', 'Copper', 'Echo', 'Lantern', 'Heron', 'Bracken'])
        [1 + c.combo % 25]
    || ' ' ||
    (CASE c.scenery[1]
         WHEN 'FOREST' THEN ARRAY['Woods', 'Grove', 'Hollow']
         WHEN 'LAKE' THEN ARRAY['Lake', 'Tarn', 'Pond']
         WHEN 'VIEWPOINT' THEN ARRAY['Lookout', 'Bluff', 'Overlook']
         WHEN 'WATERFALL' THEN ARRAY['Falls', 'Cascade', 'Creek']
         WHEN 'MOUNTAIN' THEN ARRAY['Ridge', 'Peak', 'Summit']
         ELSE ARRAY['Cove', 'Shore', 'Point']
     END)[1 + (c.combo / 25) % 3]
    || ' ' ||
    (ARRAY['Loop', 'Path', 'Trail', 'Route', 'Traverse', 'Circuit'])
        [1 + c.combo / 75]
        AS name,
    (ARRAY['loop', 'path', 'trail', 'route', 'traverse', 'circuit'])
        [1 + c.combo / 75] AS route_term
FROM composed c;

-- Trails ----------------------------------------------------------------

INSERT INTO trails (
    id,
    name,
    description,
    difficulty,
    distance_km,
    elevation_gain_m,
    estimated_duration_min,
    trailhead,
    route,
    source,
    discover_visible
)
SELECT
    s.id,
    s.name,
    'Generated sample route, not a verified trail. '
        || CASE s.difficulty WHEN 'EASY' THEN 'An easy '
                             WHEN 'MODERATE' THEN 'A moderate '
                             ELSE 'A hard ' END
        || CASE cardinality(s.scenery)
               WHEN 1 THEN lower(s.scenery[1])
               WHEN 2 THEN lower(s.scenery[1]) || ' and ' || lower(s.scenery[2])
               ELSE lower(s.scenery[1]) || ', ' || lower(s.scenery[2])
                    || ' and ' || lower(s.scenery[3])
           END
        || ' ' || s.route_term
        || ' of about ' || to_char(s.distance_km, 'FM990.0') || ' km with '
        || CASE
               WHEN s.elevation_gain_m / s.distance_km < 35 THEN 'gentle grades.'
               WHEN s.elevation_gain_m / s.distance_km < 70 THEN 'rolling terrain.'
               WHEN s.elevation_gain_m / s.distance_km < 120 THEN 'steady climbing.'
               ELSE 'sustained steep climbing.'
           END,
    s.difficulty,
    s.distance_km,
    s.elevation_gain_m,
    s.estimated_duration_min,
    ST_SetSRID(ST_MakePoint(s.longitude, s.latitude), 4326),
    NULL,
    'SYNTHETIC_DEMO',
    FALSE
FROM synthetic_trail_seed s
ORDER BY s.n;

-- Scenery ---------------------------------------------------------------

INSERT INTO trail_scenery (trail_id, scenery)
SELECT s.id, value
FROM synthetic_trail_seed s
CROSS JOIN LATERAL unnest(s.scenery) AS value;

-- Baseline gear ---------------------------------------------------------
-- Every route: footwear and water. The rest follows length, climb, time,
-- scenery, and region, with md5 variation so lists are not identical.

INSERT INTO trail_gear_requirements (trail_id, gear_category)
SELECT id, 'FOOTWEAR' FROM synthetic_trail_seed
UNION ALL
SELECT id, 'WATER' FROM synthetic_trail_seed
UNION ALL
SELECT id, 'BACKPACK' FROM synthetic_trail_seed
WHERE difficulty <> 'EASY' OR distance_km >= 6
UNION ALL
SELECT id, 'FOOD' FROM synthetic_trail_seed
WHERE estimated_duration_min >= 180
UNION ALL
SELECT id, 'SUN_PROTECTION' FROM synthetic_trail_seed
WHERE scenery && ARRAY['VIEWPOINT', 'LAKE', 'OCEAN', 'MOUNTAIN'] AND u[9] < 0.6
UNION ALL
SELECT id, 'RAIN_GEAR' FROM synthetic_trail_seed
WHERE (difficulty <> 'EASY' AND u[10] < 0.55)
   OR (scenery && ARRAY['FOREST', 'WATERFALL'] AND u[10] < 0.3)
UNION ALL
SELECT id, 'TREKKING_POLES' FROM synthetic_trail_seed
WHERE elevation_gain_m >= 700
UNION ALL
SELECT id, 'HEADLAMP' FROM synthetic_trail_seed
WHERE estimated_duration_min >= 300
UNION ALL
SELECT id, 'WARM_LAYER' FROM synthetic_trail_seed
WHERE difficulty = 'HARD'
  AND ('MOUNTAIN' = ANY (scenery) OR elevation_gain_m >= 1000)
UNION ALL
SELECT id, 'WIND_LAYER' FROM synthetic_trail_seed
WHERE difficulty <> 'EASY'
  AND scenery @> ARRAY['MOUNTAIN', 'VIEWPOINT'] AND u[11] < 0.5
UNION ALL
SELECT id, 'TRACTION' FROM synthetic_trail_seed
WHERE region = 'whistler' AND difficulty = 'HARD' AND elevation_gain_m >= 1000;
