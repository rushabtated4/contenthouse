ALTER TABLE generation_sets ADD COLUMN IF NOT EXISTS posted_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_generation_sets_posted ON generation_sets(posted_at) WHERE posted_at IS NOT NULL;
