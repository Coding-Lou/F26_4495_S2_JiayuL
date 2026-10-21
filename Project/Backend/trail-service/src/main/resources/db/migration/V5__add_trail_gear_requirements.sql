CREATE TABLE trail_gear_requirements (
                                         trail_id UUID NOT NULL,
                                         gear_category VARCHAR(50) NOT NULL,

                                         CONSTRAINT pk_trail_gear_requirements
                                             PRIMARY KEY (trail_id, gear_category),

                                         CONSTRAINT fk_trail_gear_requirements_trail
                                             FOREIGN KEY (trail_id)
                                                 REFERENCES trails(id)
                                                 ON DELETE CASCADE,

                                         CONSTRAINT chk_trail_gear_category
                                             CHECK (
                                                 gear_category IN (
                                                                   'FOOTWEAR',
                                                                   'RAIN_GEAR',
                                                                   'WARM_LAYER',
                                                                   'WIND_LAYER',
                                                                   'TREKKING_POLES',
                                                                   'TRACTION',
                                                                   'HEADLAMP',
                                                                   'BACKPACK',
                                                                   'WATER',
                                                                   'FOOD',
                                                                   'SUN_PROTECTION'
                                                     )
                                                 )
);