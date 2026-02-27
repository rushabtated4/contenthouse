-- Background folders for organizing background library images
CREATE TABLE background_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE background_library ADD COLUMN folder_id UUID REFERENCES background_folders(id) ON DELETE SET NULL;

CREATE INDEX idx_background_library_folder ON background_library(folder_id);

ALTER TABLE background_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on background_folders" ON background_folders FOR ALL USING (true) WITH CHECK (true);
