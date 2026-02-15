-- Partial index for the /api/videos query:
-- filters original_images IS NOT NULL, orders by created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_videos_carousels
  ON videos (created_at DESC)
  WHERE original_images IS NOT NULL;
