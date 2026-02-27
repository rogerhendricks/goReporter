-- Add UDID column for leads
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS udid BIGINT;

CREATE INDEX IF NOT EXISTS idx_leads_udid ON leads(udid);
