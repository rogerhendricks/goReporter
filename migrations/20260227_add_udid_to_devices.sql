-- Add UDID column for devices
ALTER TABLE devices
    ADD COLUMN IF NOT EXISTS udid BIGINT;

-- Index to speed up search/filter by UDID
CREATE INDEX IF NOT EXISTS idx_devices_udid ON devices(udid);
