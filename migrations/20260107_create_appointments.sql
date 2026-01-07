-- Migration: create appointments table for patient scheduling

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
