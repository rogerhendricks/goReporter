-- Migration: Add type field to tags table
-- This allows separating patient tags from report tags

-- Add type column with default value 'patient' for existing tags
ALTER TABLE tags ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'patient';

-- Create index on type for better query performance
CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type);

-- Drop the old unique index on name only
DROP INDEX IF EXISTS idx_tags_name;

-- Create a composite unique index on name and type
-- This allows same name for different types (e.g., "Critical" for both patients and reports)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_name_type ON tags(name, type);

-- Update existing tags to have 'patient' type if not already set
UPDATE tags SET type = 'patient' WHERE type IS NULL OR type = '';
