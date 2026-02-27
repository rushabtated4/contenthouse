-- Hook Creator tables

CREATE TABLE hook_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL CHECK (source_type IN ('upload', 'tiktok')),
  tiktok_url TEXT,
  tiktok_video_id TEXT,
  video_url TEXT NOT NULL,
  video_duration REAL,
  trim_start REAL DEFAULT 0,
  trim_end REAL,
  snapshot_url TEXT,
  snapshot_timestamp REAL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'snapshot_ready', 'generating_images', 'images_ready', 'generating_videos', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE hook_generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES hook_sessions(id) ON DELETE CASCADE,
  image_url TEXT,
  prompt TEXT NOT NULL,
  replicate_prediction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE hook_generated_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES hook_sessions(id) ON DELETE CASCADE,
  source_image_id UUID NOT NULL REFERENCES hook_generated_images(id) ON DELETE CASCADE,
  video_url TEXT,
  prompt TEXT,
  character_orientation TEXT DEFAULT 'image' CHECK (character_orientation IN ('image', 'video')),
  keep_original_sound BOOLEAN DEFAULT true,
  replicate_prediction_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  error_message TEXT,
  is_used BOOLEAN DEFAULT false,
  channel_id UUID REFERENCES project_accounts(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_hook_generated_images_session ON hook_generated_images(session_id);
CREATE INDEX idx_hook_generated_videos_session ON hook_generated_videos(session_id);
CREATE INDEX idx_hook_generated_videos_prediction ON hook_generated_videos(replicate_prediction_id);
CREATE INDEX idx_hook_generated_videos_scheduled ON hook_generated_videos(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- RLS (permissive, single-user)
ALTER TABLE hook_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook_generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE hook_generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on hook_sessions" ON hook_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on hook_generated_images" ON hook_generated_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on hook_generated_videos" ON hook_generated_videos FOR ALL USING (true) WITH CHECK (true);
