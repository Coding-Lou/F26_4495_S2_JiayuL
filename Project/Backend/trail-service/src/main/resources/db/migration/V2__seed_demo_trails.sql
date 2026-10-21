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
    source
)
VALUES

    (
        '11111111-1111-1111-1111-111111111111',
        'Quarry Rock',
        'Popular forest hike near Deep Cove with a viewpoint overlooking Indian Arm.',
        'MODERATE',
        5.8,
        220,
        120,
        ST_SetSRID(ST_MakePoint(-122.9368, 49.3265), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '22222222-2222-2222-2222-222222222222',
        'Grouse Grind',
        'Steep uphill trail on Grouse Mountain known for its continuous climb.',
        'HARD',
        2.5,
        800,
        120,
        ST_SetSRID(ST_MakePoint(-123.0814, 49.3723), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '33333333-3333-3333-3333-333333333333',
        'Dog Mountain',
        'Forest trail on Mount Seymour leading to viewpoints over Vancouver.',
        'MODERATE',
        5.0,
        160,
        120,
        ST_SetSRID(ST_MakePoint(-122.9490, 49.3679), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '44444444-4444-4444-4444-444444444444',
        'Bowen Lookout',
        'Scenic trail in Cypress Provincial Park with views toward Howe Sound.',
        'MODERATE',
        4.5,
        110,
        100,
        ST_SetSRID(ST_MakePoint(-123.1917, 49.3967), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '55555555-5555-5555-5555-555555555555',
        'Stawamus Chief',
        'Popular Squamish hike with steep climbing and panoramic viewpoints.',
        'HARD',
        6.0,
        540,
        240,
        ST_SetSRID(ST_MakePoint(-123.1420, 49.6860), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '66666666-6666-6666-6666-666666666666',
        'Garibaldi Lake',
        'Long alpine hike leading to Garibaldi Lake in Garibaldi Provincial Park.',
        'HARD',
        18.0,
        820,
        360,
        ST_SetSRID(ST_MakePoint(-123.1217, 49.9570), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '77777777-7777-7777-7777-777777777777',
        'Lindeman Lake',
        'Forest and mountain trail leading to a turquoise lake near Chilliwack.',
        'MODERATE',
        7.0,
        350,
        180,
        ST_SetSRID(ST_MakePoint(-121.4550, 49.0335), 4326),
        NULL,
        'DEMO_SEED'
    ),

    (
        '88888888-8888-8888-8888-888888888888',
        'Joffre Lakes',
        'Mountain trail passing several alpine lakes with glacier views.',
        'HARD',
        10.0,
        370,
        240,
        ST_SetSRID(ST_MakePoint(-122.4425, 50.3694), 4326),
        NULL,
        'DEMO_SEED'
    );