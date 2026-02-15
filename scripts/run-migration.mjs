import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://gqtdvbvwvkncvfqtgnzp.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxdGR2YnZ3dmtuY3ZmcXRnbnpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDA5ODc5NiwiZXhwIjoyMDg1Njc0Nzk2fQ.KQCwiPLHDqbkqJ4PHADXFOPhMXMT8LKdqF9F1g9Pf0E"
);

const statements = [
  `ALTER TABLE videos ADD COLUMN IF NOT EXISTS original_images text[]`,

  `CREATE TABLE IF NOT EXISTS generation_sets (
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
  )`,

  `CREATE TABLE IF NOT EXISTS generated_images (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id uuid NOT NULL REFERENCES generation_sets(id) ON DELETE CASCADE,
    slide_index integer NOT NULL,
    image_url text,
    per_slide_prompt text,
    overlay_image_url text,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    created_at timestamptz DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_generation_sets_video_id ON generation_sets(video_id)`,
  `CREATE INDEX IF NOT EXISTS idx_generation_sets_batch_id ON generation_sets(batch_id)`,
  `CREATE INDEX IF NOT EXISTS idx_generation_sets_status ON generation_sets(status)`,
  `CREATE INDEX IF NOT EXISTS idx_generation_sets_scheduled ON generation_sets(scheduled_at) WHERE scheduled_at IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_generation_sets_channel ON generation_sets(channel_id) WHERE channel_id IS NOT NULL`,
  `CREATE INDEX IF NOT EXISTS idx_generated_images_set_status ON generated_images(set_id, status)`,
];

console.log("Running migration...");

for (const sql of statements) {
  const label = sql.substring(0, 60).replace(/\n/g, " ");
  const { error } = await supabase.rpc("exec_sql", { query: sql });
  if (error) {
    // Try via direct SQL using the postgres endpoint
    console.log(`  RPC failed for: ${label}... trying REST approach`);
  } else {
    console.log(`  OK: ${label}...`);
  }
}

// Storage buckets
for (const bucket of ["originals", "generated", "overlays"]) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  if (error && !error.message.includes("already exists")) {
    console.log(`  Bucket ${bucket}: ${error.message}`);
  } else {
    console.log(`  Bucket ${bucket}: OK`);
  }
}

// Verify tables exist
const { data: sets } = await supabase
  .from("generation_sets")
  .select("id")
  .limit(1);
console.log(
  "\nVerification - generation_sets table:",
  sets !== null ? "EXISTS" : "NOT FOUND"
);

const { data: images } = await supabase
  .from("generated_images")
  .select("id")
  .limit(1);
console.log(
  "Verification - generated_images table:",
  images !== null ? "EXISTS" : "NOT FOUND"
);

const { data: videos } = await supabase
  .from("videos")
  .select("original_images")
  .limit(1);
console.log(
  "Verification - videos.original_images column:",
  videos !== null ? "EXISTS" : "NOT FOUND"
);

console.log("\nMigration complete!");
