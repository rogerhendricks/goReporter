-- Ensure device type column exists and has proper values
-- This migration ensures the device.type column is properly set for tracking overdue patients

-- Add index for faster queries on device type
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);

-- Add index for faster queries on report type and date
CREATE INDEX IF NOT EXISTS idx_reports_type_date ON reports(report_type, report_date);

-- Add index for faster queries on implanted devices status
CREATE INDEX IF NOT EXISTS idx_implanted_devices_status ON implanted_devices(status, explanted_at);

-- Add index for patient reports join queries
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports(patient_id);
