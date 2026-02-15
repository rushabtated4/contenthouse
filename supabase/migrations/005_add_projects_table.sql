-- Migration 005: Document projects table and project_accounts.project_id FK
-- NOTE: These tables/columns already exist in the database.
-- This migration is documentation-only, wrapped in IF NOT EXISTS guards.

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (permissive, single-user)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'projects' AND policyname = 'Allow all'
  ) THEN
    CREATE POLICY "Allow all" ON projects FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- project_accounts.project_id FK (column already exists)
-- ALTER TABLE project_accounts ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES projects(id);
-- ALTER TABLE project_accounts ADD COLUMN IF NOT EXISTS nickname text;

-- Note: project_accounts uses `added_at` (not `created_at`) as its timestamp column.
