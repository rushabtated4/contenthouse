-- ContentHouse Schema Migration
-- Adds original_images column to existing videos table
-- Creates generation_sets and generated_images tables
-- Sets up indexes and Realtime

-- Add original_images column to existing videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS original_images text[];

-- generation_sets table (new)
CREATE TABLE IF NOT EXISTS generation_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES videos(id),
  set_index integer NOT NULL,
  batch_id uuid NOT NULL,
  first_slide_prompt text,
  other_slides_prompt text,
  quality_input text DEFAULT 'high',
  quality_output text DEFAULT 'medium',
  output_format text DEFAULT 'png',
  selected_slides integer[],
  status text NOT NULL DEFAULT 'queued',
  progress_current integer DEFAULT 0,
  progress_total integer DEFAULT 0,
  channel_id uuid REFERENCES project_accounts(id),
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- generated_images table (new)
CREATE TABLE IF NOT EXISTS generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES generation_sets(id) ON DELETE CASCADE,
  slide_index integer NOT NULL,
  image_url text,
  per_slide_prompt text,
  overlay_image_url text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generation_sets_video_id ON generation_sets(video_id);
CREATE INDEX IF NOT EXISTS idx_generation_sets_batch_id ON generation_sets(batch_id);
CREATE INDEX IF NOT EXISTS idx_generation_sets_status ON generation_sets(status);
CREATE INDEX IF NOT EXISTS idx_generation_sets_scheduled ON generation_sets(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generation_sets_channel ON generation_sets(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_generated_images_set_status ON generated_images(set_id, status);

-- Enable Realtime on new tables
ALTER PUBLICATION supabase_realtime ADD TABLE generation_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE generated_images;

-- Create storage buckets (idempotent via INSERT ... ON CONFLICT)
INSERT INTO storage.buckets (id, name, public) VALUES ('originals', 'originals', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('generated', 'generated', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('overlays', 'overlays', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow public read access
CREATE POLICY "Public read originals" ON storage.objects FOR SELECT USING (bucket_id = 'originals');
CREATE POLICY "Public read generated" ON storage.objects FOR SELECT USING (bucket_id = 'generated');
CREATE POLICY "Public read overlays" ON storage.objects FOR SELECT USING (bucket_id = 'overlays');

-- Storage policies: allow service role uploads (via anon key for single-user tool)
CREATE POLICY "Allow uploads originals" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'originals');
CREATE POLICY "Allow uploads generated" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'generated');
CREATE POLICY "Allow uploads overlays" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'overlays');

-- Allow updates and deletes on storage
CREATE POLICY "Allow updates originals" ON storage.objects FOR UPDATE USING (bucket_id = 'originals');
CREATE POLICY "Allow updates generated" ON storage.objects FOR UPDATE USING (bucket_id = 'generated');
CREATE POLICY "Allow updates overlays" ON storage.objects FOR UPDATE USING (bucket_id = 'overlays');
CREATE POLICY "Allow deletes originals" ON storage.objects FOR DELETE USING (bucket_id = 'originals');
CREATE POLICY "Allow deletes generated" ON storage.objects FOR DELETE USING (bucket_id = 'generated');
CREATE POLICY "Allow deletes overlays" ON storage.objects FOR DELETE USING (bucket_id = 'overlays');

-- RLS: Disable for single-user tool (no auth)
ALTER TABLE generation_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all generation_sets" ON generation_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all generated_images" ON generated_images FOR ALL USING (true) WITH CHECK (true);
