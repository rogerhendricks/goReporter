-- Migration: Retroactively assign slots to existing clinic appointments

-- First, create slots for all existing clinic appointments that don't have a slot_id
INSERT INTO appointment_slots (slot_time, location, max_capacity, booked_count, created_at, updated_at)
SELECT DISTINCT
    date_trunc('hour', start_at) + 
    (floor(extract(minute from start_at) / 15) * interval '15 minutes') as slot_time,
    'clinic' as location,
    4 as max_capacity,
    0 as booked_count,
    NOW() as created_at,
    NOW() as updated_at
FROM appointments
WHERE location = 'clinic' 
    AND slot_id IS NULL 
    AND deleted_at IS NULL
ON CONFLICT (slot_time, location) DO NOTHING;

-- Then, update appointments to reference their slots and increment booked_count
UPDATE appointments a
SET slot_id = s.id
FROM appointment_slots s
WHERE a.location = 'clinic'
    AND a.slot_id IS NULL
    AND a.deleted_at IS NULL
    AND s.location = 'clinic'
    AND s.slot_time = (
        date_trunc('hour', a.start_at) + 
        (floor(extract(minute from a.start_at) / 15) * interval '15 minutes')
    );

-- Finally, update the booked_count for each slot
UPDATE appointment_slots s
SET booked_count = (
    SELECT COUNT(*)
    FROM appointments a
    WHERE a.slot_id = s.id 
        AND a.deleted_at IS NULL
        AND a.location = 'clinic'
)
WHERE s.location = 'clinic';
