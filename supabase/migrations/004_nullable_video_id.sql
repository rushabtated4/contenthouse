-- Make video_id nullable on generation_sets (uploaded posts don't need a video row)
ALTER TABLE generation_sets ALTER COLUMN video_id DROP NOT NULL;

-- Add title column for uploaded posts (fallback when no video row exists)
ALTER TABLE generation_sets ADD COLUMN IF NOT EXISTS title text;
