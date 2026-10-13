UPDATE gear_items
SET category = CASE category
    WHEN 'Footwear' THEN 'FOOTWEAR'
    WHEN 'Rain Gear' THEN 'RAIN_GEAR'
    WHEN 'Warm Layer' THEN 'WARM_LAYER'
    WHEN 'Wind Layer' THEN 'WIND_LAYER'
    WHEN 'Hiking Poles' THEN 'TREKKING_POLES'
    WHEN 'Traction' THEN 'TRACTION'
    WHEN 'Headlamp' THEN 'HEADLAMP'
    WHEN 'Backpack' THEN 'BACKPACK'
    WHEN 'Water' THEN 'WATER'
    WHEN 'Food' THEN 'FOOD'
    WHEN 'Sun Protection' THEN 'SUN_PROTECTION'
END
WHERE category IN (
    'Footwear',
    'Rain Gear',
    'Warm Layer',
    'Wind Layer',
    'Hiking Poles',
    'Traction',
    'Headlamp',
    'Backpack',
    'Water',
    'Food',
    'Sun Protection'
);
