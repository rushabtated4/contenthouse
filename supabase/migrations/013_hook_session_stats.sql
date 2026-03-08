ALTER TABLE hook_sessions
  ADD COLUMN tiktok_play_count BIGINT,
  ADD COLUMN tiktok_digg_count BIGINT,
  ADD COLUMN tiktok_comment_count BIGINT,
  ADD COLUMN tiktok_share_count BIGINT,
  ADD COLUMN tiktok_collect_count BIGINT;
