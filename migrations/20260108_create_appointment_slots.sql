-- Migration: create appointment_slots table for clinic slot management

CREATE TABLE IF NOT EXISTS appointment_slots (
    id SERIAL PRIMARY KEY,
    slot_time TIMESTAMPTZ NOT NULL,
    location VARCHAR(32) NOT NULL DEFAULT 'clinic',
    max_capacity INTEGER NOT NULL DEFAULT 4,
    booked_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_booked_count CHECK (booked_count >= 0 AND booked_count <= max_capacity)
);

-- Create unique index on slot_time and location combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointment_slots_time_location ON appointment_slots(slot_time, location);

-- Add slot_id reference to appointments table for clinic appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS slot_id INTEGER REFERENCES appointment_slots(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_slot_id ON appointments(slot_id);
