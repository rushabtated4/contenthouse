-- Posters table for employee posting portal
CREATE TABLE posters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add poster_id FK to project_accounts
ALTER TABLE project_accounts
  ADD COLUMN poster_id uuid REFERENCES posters(id) ON DELETE SET NULL;

CREATE INDEX idx_project_accounts_poster_id ON project_accounts(poster_id);
