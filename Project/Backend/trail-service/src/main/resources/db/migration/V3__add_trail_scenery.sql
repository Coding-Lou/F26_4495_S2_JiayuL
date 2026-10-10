CREATE TABLE trail_scenery (
                               trail_id UUID NOT NULL,
                               scenery VARCHAR(30) NOT NULL,

                               CONSTRAINT pk_trail_scenery
                                   PRIMARY KEY (trail_id, scenery),

                               CONSTRAINT fk_trail_scenery_trail
                                   FOREIGN KEY (trail_id)
                                       REFERENCES trails(id)
                                       ON DELETE CASCADE,

                               CONSTRAINT chk_trail_scenery
                                   CHECK (
                                       scenery IN (
                                                   'LAKE',
                                                   'VIEWPOINT',
                                                   'WATERFALL',
                                                   'FOREST',
                                                   'MOUNTAIN',
                                                   'OCEAN'
                                           )
                                       )
);


-- Quarry Rock
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'VIEWPOINT'
FROM trails
WHERE name = 'Quarry Rock';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'FOREST'
FROM trails
WHERE name = 'Quarry Rock';


-- Grouse Grind
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'MOUNTAIN'
FROM trails
WHERE name = 'Grouse Grind';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'VIEWPOINT'
FROM trails
WHERE name = 'Grouse Grind';


-- Dog Mountain
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'FOREST'
FROM trails
WHERE name = 'Dog Mountain';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'VIEWPOINT'
FROM trails
WHERE name = 'Dog Mountain';


-- Bowen Lookout
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'VIEWPOINT'
FROM trails
WHERE name = 'Bowen Lookout';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'MOUNTAIN'
FROM trails
WHERE name = 'Bowen Lookout';


-- Stawamus Chief
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'VIEWPOINT'
FROM trails
WHERE name = 'Stawamus Chief';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'MOUNTAIN'
FROM trails
WHERE name = 'Stawamus Chief';


-- Garibaldi Lake
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'LAKE'
FROM trails
WHERE name = 'Garibaldi Lake';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'MOUNTAIN'
FROM trails
WHERE name = 'Garibaldi Lake';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'FOREST'
FROM trails
WHERE name = 'Garibaldi Lake';


-- Lindeman Lake
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'LAKE'
FROM trails
WHERE name = 'Lindeman Lake';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'FOREST'
FROM trails
WHERE name = 'Lindeman Lake';


-- Joffre Lakes
INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'LAKE'
FROM trails
WHERE name = 'Joffre Lakes';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'MOUNTAIN'
FROM trails
WHERE name = 'Joffre Lakes';

INSERT INTO trail_scenery (trail_id, scenery)
SELECT id, 'VIEWPOINT'
FROM trails
WHERE name = 'Joffre Lakes';