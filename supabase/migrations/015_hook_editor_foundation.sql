-- Demo videos library
CREATE TABLE demo_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  duration REAL,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_demo_videos_created ON demo_videos(created_at DESC);

-- Hook compositions (edited hook videos with text overlays + demo concat)
CREATE TABLE hook_compositions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_video_id UUID NOT NULL REFERENCES hook_generated_videos(id) ON DELETE CASCADE,
  demo_video_id UUID REFERENCES demo_videos(id) ON DELETE SET NULL,
  rendered_video_url TEXT,
  thumbnail_url TEXT,
  text_overlays JSONB DEFAULT '[]',
  duration REAL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'rendering', 'completed', 'failed')),
  error_message TEXT,
  review_status TEXT DEFAULT 'unverified' CHECK (review_status IN ('unverified', 'ready_to_post')),
  channel_id UUID REFERENCES project_accounts(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_hook_compositions_source ON hook_compositions(source_video_id);
CREATE INDEX idx_hook_compositions_scheduled ON hook_compositions(scheduled_at) WHERE scheduled_at IS NOT NULL;
