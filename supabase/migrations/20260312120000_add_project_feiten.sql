ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_feiten jsonb DEFAULT '[]'::jsonb;
