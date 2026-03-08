ALTER TABLE hook_sessions
  ADD COLUMN trimmed_video_url TEXT,
  ADD COLUMN trimmed_thumbnail_url TEXT,
  ADD COLUMN trimmed_duration REAL,
  ADD COLUMN source_session_id UUID REFERENCES hook_sessions(id) ON DELETE SET NULL;

ALTER TABLE hook_sessions DROP CONSTRAINT IF EXISTS hook_sessions_source_type_check;
ALTER TABLE hook_sessions ADD CONSTRAINT hook_sessions_source_type_check
  CHECK (source_type IN ('upload', 'tiktok', 'clip'));

CREATE INDEX idx_hook_sessions_trimmed
  ON hook_sessions(created_at DESC) WHERE trimmed_video_url IS NOT NULL;
