# Database Schema

> **Auto-update rule:** When any table, column, index, or RLS policy changes, update this file. See `CLAUDE.md` for details.

**Provider:** Supabase PostgreSQL
**Project ref:** `gqtdvbvwvkncvfqtgnzp`
**Migration files:**
- `supabase/migrations/001_contenthouse_schema.sql` — Initial schema
- `supabase/migrations/002_add_posted_at.sql` — Add `posted_at` column + index
- `supabase/migrations/003_videos_carousel_index.sql` — Partial index for carousel listing
- `supabase/migrations/004_nullable_video_id.sql` — Make `video_id` nullable, add `title` column
- `supabase/migrations/005_add_projects_table.sql` — Document `projects` table and `project_accounts` FK
- `supabase/migrations/006_account_posting_schedule.sql` — Add `days_of_week`, `posts_per_day` to `project_accounts`
- `supabase/migrations/007_background_library.sql` — Add `background_library` table + `backgrounds` storage bucket + indexes
- `supabase/migrations/008_editor_state.sql` — Add `editor_state` JSONB column to `generation_sets`
- `supabase/migrations/009_review_status.sql` — Add `review_status` column to `generation_sets`

---

## Tables

### `videos` (existing — 14,706 rows)

TikTok post metadata. Pre-existing table; added `original_images` column for carousel support.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `video_id` | text | NO | — | TikTok video ID |
| `url` | text | NO | — | Full TikTok URL |
| `description` | text | YES | — | Post caption |
| `hashtags` | text[] | YES | — | Parsed hashtag array |
| `views` | bigint | YES | — | View count |
| `likes` | bigint | YES | — | Like count |
| `comments` | bigint | YES | — | Comment count |
| `shares` | bigint | YES | — | Share count |
| `account_id` | uuid | YES | — | FK to project_accounts |
| `posted_at` | timestamptz | YES | — | Original post date |
| `original_images` | text[] | YES | — | **Added.** Supabase Storage URLs of carousel images |
| `bucket` | text | YES | — | Legacy field |
| `first_seen_date` | timestamptz | YES | — | Legacy field |
| `last_updated` | timestamptz | YES | — | Legacy field |
| `viral_since` | timestamptz | YES | — | Legacy field |
| `created_at` | timestamptz | NO | `now()` | Record creation |

**Indexes:**
- PK on `id`
- Unique on `url` (dedup)
- `idx_videos_carousels` on `created_at DESC` WHERE `original_images IS NOT NULL` (partial — speeds up carousel listing)

---

### `projects` (existing)

Project groupings for organizing TikTok accounts.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | — | Project name |
| `color` | text | YES | — | Hex color for UI display |
| `created_at` | timestamptz | NO | `now()` | Record creation |
| `updated_at` | timestamptz | NO | `now()` | Last update |

---

### `project_accounts` (existing)

TikTok channels used for post scheduling, grouped by project.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `project_id` | uuid | NO | — | FK → `projects.id` |
| `username` | text | NO | — | TikTok username (@handle) |
| `nickname` | text | YES | — | Display name / nickname |
| `added_at` | timestamptz | NO | `now()` | Record creation |
| `days_of_week` | integer[] | YES | `'{1,2,3,4,5}'` | **Added (006).** JS `getDay()` convention: 0=Sun…6=Sat |
| `posts_per_day` | integer | YES | `1` | **Added (006).** Number of posts per active day (1–5) |

---

### `generation_sets` (new)

A set of AI-generated variations for selected slides of a carousel.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `video_id` | uuid | YES | — | FK → `videos.id` (null for uploaded posts) |
| `title` | text | YES | — | Title for uploaded posts (fallback when no video row) |
| `set_index` | integer | NO | `0` | Index within batch (0-based) |
| `batch_id` | uuid | NO | — | Groups multiple sets created together |
| `first_slide_prompt` | text | YES | — | Prompt used for slide index 0 |
| `other_slides_prompt` | text | YES | — | Prompt used for all other slides |
| `quality_input` | text | NO | `'high'` | OpenAI input detail: `low` / `high` |
| `quality_output` | text | NO | `'medium'` | OpenAI output quality: `low` / `medium` / `high` |
| `output_format` | text | NO | `'png'` | Output format: `png` / `jpeg` / `webp` |
| `selected_slides` | integer[] | YES | — | Array of slide indices to generate |
| `editor_state` | jsonb | YES | — | Saved editor canvas state (EditorStateJson) |
| `status` | text | NO | `'queued'` | `queued` / `processing` / `completed` / `partial` / `failed` / `editor_draft` |
| `review_status` | text | NO | `'unverified'` | `unverified` / `ready_to_post` |
| `progress_current` | integer | NO | `0` | Images processed so far |
| `progress_total` | integer | NO | `0` | Total images to process |
| `channel_id` | uuid | YES | — | FK → `project_accounts.id` (scheduling) |
| `scheduled_at` | timestamptz | YES | — | When to post (scheduling) |
| `notes` | text | YES | — | User notes for scheduling |
| `posted_at` | timestamptz | YES | — | When the set was marked as posted |
| `created_at` | timestamptz | NO | `now()` | Record creation |
| `updated_at` | timestamptz | NO | `now()` | Last update |

**Indexes:**
- PK on `id`
- `idx_generation_sets_video_id` on `video_id`
- `idx_generation_sets_batch_id` on `batch_id`
- `idx_generation_sets_status` on `status`
- `idx_generation_sets_scheduled` on `scheduled_at` WHERE `scheduled_at IS NOT NULL`
- `idx_generation_sets_channel` on `channel_id` WHERE `channel_id IS NOT NULL`
- `idx_generation_sets_posted` on `posted_at` WHERE `posted_at IS NOT NULL`
- `idx_generation_sets_review_status` on `review_status`

---

### `generated_images` (new)

Individual AI-generated image records, one per slide per set.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `set_id` | uuid | NO | — | FK → `generation_sets.id` (CASCADE delete) |
| `slide_index` | integer | NO | — | Which slide in the carousel (0-based) |
| `image_url` | text | YES | — | Supabase Storage URL of generated image |
| `per_slide_prompt` | text | YES | — | Custom prompt for this specific slide |
| `overlay_image_url` | text | YES | — | Overlay image URL (from `overlays` bucket) |
| `status` | text | NO | `'pending'` | `pending` / `generating` / `completed` / `failed` |
| `error_message` | text | YES | — | Error details if status = failed |
| `created_at` | timestamptz | NO | `now()` | Record creation |

**Indexes:**
- PK on `id`
- `idx_generated_images_set_status` on `(set_id, status)`

---

### `background_library` (new)

Saved background images for the editor mode. Backgrounds can be AI-generated (text removed) or user-uploaded.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `image_url` | text | NO | — | Supabase Storage URL in `backgrounds` bucket |
| `source` | text | NO | — | `'generated'` or `'uploaded'` |
| `prompt` | text | YES | — | Prompt used for generation (null for uploads) |
| `source_video_id` | uuid | YES | — | FK → `videos.id` (which video this bg was generated from) |
| `width` | integer | YES | — | Image width in pixels |
| `height` | integer | YES | — | Image height in pixels |
| `created_at` | timestamptz | NO | `now()` | Record creation |

**Indexes:**
- PK on `id`
- `idx_background_library_created_at` on `created_at DESC`
- `idx_background_library_source_video` on `source_video_id`

---

## Relationships

```
projects
  │
  └──< project_accounts.project_id

videos
  │
  ├──< generation_sets.video_id
  │       │
  │       ├── generation_sets.channel_id >── project_accounts
  │       │
  │       └──< generated_images.set_id (CASCADE delete)
  │
  ├──< background_library.source_video_id
  │
  └── videos.account_id >── project_accounts
```

---

## Storage Buckets

| Bucket | Purpose | Naming Pattern | Cleanup |
|---|---|---|---|
| `originals` | Downloaded TikTok carousel images | `{videoId}/{uuid}.png` | Manual |
| `generated` | AI-generated variation images | `{setId}/{uuid}.{format}` | Manual |
| `overlays` | User-uploaded overlay images | `{uuid}.png` | Manual |
| `backgrounds` | Editor background images (generated/uploaded) | `{uuid}.png` | Manual (or via DELETE /api/backgrounds/[id]) |

All buckets have public read access. Uploads use `upsert: false` (UUID filenames ensure uniqueness).

---

## Row Level Security (RLS)

All tables use **permissive policies** (allow all operations for all users). This is a single-user tool with no authentication.

```sql
-- Example policy on generation_sets
CREATE POLICY "Allow all" ON generation_sets FOR ALL USING (true) WITH CHECK (true);
```

---

## Realtime

Supabase Realtime is enabled on:
- `generation_sets` — Status and progress updates
- `generated_images` — Individual image status changes

Client subscribes via `useGenerationProgress` hook to track live progress.

---

## Updated At Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON generation_sets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```
