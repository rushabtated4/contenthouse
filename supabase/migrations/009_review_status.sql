-- Add review_status column to generation_sets
ALTER TABLE generation_sets
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'unverified';

-- Index for filtering by review_status
CREATE INDEX IF NOT EXISTS idx_generation_sets_review_status ON generation_sets(review_status);
