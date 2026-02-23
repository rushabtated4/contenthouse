-- Background library for editor mode
CREATE TABLE IF NOT EXISTS background_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'generated' CHECK (source IN ('generated', 'uploaded')),
  prompt TEXT,
  source_video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_background_library_created_at ON background_library(created_at DESC);
CREATE INDEX idx_background_library_source_video ON background_library(source_video_id);

-- Create backgrounds storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('backgrounds', 'backgrounds', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read backgrounds" ON storage.objects FOR SELECT USING (bucket_id = 'backgrounds');

-- Permissive RLS (single-user tool)
ALTER TABLE background_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on background_library" ON background_library FOR ALL USING (true) WITH CHECK (true);
