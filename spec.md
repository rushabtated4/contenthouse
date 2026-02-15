# ContentHouse - TikTok Carousel Replication Tool

## Overview

A single-user tool for replicating viral TikTok carousels using AI image generation. Fetches carousel data from TikTok via RapidAPI, generates new visually-similar images using OpenAI's `gpt-image-1.5` API, strips all AI provenance metadata (Synth ID / C2PA) at generation time, and organizes scheduled posts in a calendar view.

**Deployment:** Vercel (constrains queue architecture to batched processing with 300s `maxDuration`).

---

## Tech Stack

- **Frontend**: Next.js (App Router) + Tailwind CSS + shadcn/ui (cherry-picked components)
- **Database**: Supabase (Postgres)
- **File Storage**: Supabase Storage
- **TikTok Data**: RapidAPI (`tiktok-api23` provider)
- **Image Generation**: OpenAI `gpt-image-1.5` API
- **Realtime**: Supabase Realtime (for generation queue progress)
- **Calendar**: @fullcalendar/react v6 (day/week/month views, drag-and-drop)
- **Metadata Stripping**: sharp (strips EXIF, XMP, C2PA, PNG ancillary chunks)
- **ZIP Downloads**: archiver (server-side streaming ZIP creation)
- **Toasts**: sonner
- **Auth**: None (single-user tool, no authentication)
- **Config**: All API keys and connection strings via `.env`
- **UI Aesthetic**: Warm Mem-inspired (soft gradients, rounded corners, muted warm tones)

---

## Application Tabs

### 1. All Carousels

A grid/list view of every saved carousel (sourced from the existing `videos` table).

**Card contents:**
- First slide thumbnail of the original TikTok carousel
- Engagement metrics: views, comments, shares, likes
- Number of generation sets produced from this video
- Link to the original TikTok post

**Interactions:**
- Hover reveals a **Regenerate** button that navigates the user to the **Generate** tab with this video pre-loaded (prompts, settings, and original slides ready to tweak)
- Click a card to expand or navigate to its detail/generate view

**Duplicate handling:** If a user pastes a TikTok URL that already exists in the `videos` table, the system silently auto-merges by loading the existing entry and navigating to its Generate page.

---

### 2. Generate

The main workspace for carousel image generation.

#### Fetching Flow

1. User pastes a TikTok carousel URL into an input field
2. System calls `tiktok-api23` via RapidAPI to fetch carousel data
3. On success: original slide images load in a scrollable grid, top bar populates with carousel metadata
4. On failure (age gate, private account, region lock, etc.): display a specific error message and offer a **manual upload fallback** where the user can upload carousel images directly

#### Top Bar (Carousel Info)

Displays engagement metrics and metadata fetched from TikTok:
- Views, likes, comments, shares
- Creator username
- Original post date
- Hashtags
- Carousel description

#### Slide Grid (Original Images)

- All original slides displayed in a scrollable grid (no pagination, no max limit)
- Each slide can be **deselected** (toggled off) to exclude it from generation
- Below each original slide: the corresponding generated output(s) for visual comparison

#### Per-Slide Controls

Each slide has:
- **Text prompt input** (optional): custom generation prompt for this specific slide
- **Image attachment** (optional): an overlay/composite image (e.g., logo, watermark) sent to `gpt-image-1.5` as part of the prompt so the AI naturally integrates it into the generated image
  - Overlay positioning is **prompt-driven only** — the user describes placement in their text prompt (e.g., "place the logo in the bottom-right corner"), no structured position controls

#### Global Controls

| Control | Description |
|---|---|
| **Default first image prompt** | A saved prompt template that auto-fills the first slide's prompt box for every new carousel. First slides typically have a hook/title treatment that differs from content slides. User sets this manually. |
| **Default other images prompt** | A saved prompt template that auto-fills all non-first slide prompt boxes |
| **Quality (input)** | Maps to OpenAI's `input_fidelity` parameter (`low` / `high`) |
| **Quality (output)** | Maps to OpenAI's `quality` parameter (`low` / `medium` / `high`) |
| **Number of carousel sets** | How many variant sets to generate (e.g., 5 sets = 5 full carousels, each using the same prompts but different generation seeds) |
| **Output format** | User picks: PNG, JPEG, or WebP |
| **Generate button** | Triggers the generation pipeline |

#### Output Dimensions

All generated images are forced to **1080x1350** (TikTok's standard 4:5 carousel ratio), regardless of the original carousel's dimensions. Generated at `1024x1536` (closest supported gpt-image-1 4:5 size) then resized to 1080x1350 via sharp during metadata stripping.

#### Generation Pipeline

1. All selected slides are generated **in parallel** (independent, no chained context between slides)
2. Each image request sends: the original slide image + per-slide prompt (or global prompt fallback) + optional overlay image
3. Synth ID and C2PA metadata are **stripped immediately** after generation, before storing to Supabase Storage
4. Generation is managed via a **server-side queue** stored in Supabase, processed by an API route
5. Live progress is pushed to the UI via **Supabase Realtime** subscriptions (survives page refresh)
6. Progress bar shows per-image and overall set completion status
7. Rate limits are handled by the queue — requests are paced to stay within OpenAI's limits

#### Queue Architecture (Vercel-compatible)

**Problem:** Vercel Pro has a 300s max timeout (`maxDuration`). A run with 50 images at ~9s each = 450s, exceeding the limit.

**Solution:** Batch processing with self-chaining. Each API call processes a batch of ~5 images, then fires a fetch to itself for the next batch before returning.

```
POST /api/queue/process { setId, batchStart: 0 }
  → Process images 0-4 for this set
  → fetch('/api/queue/process', { setId, batchStart: 5 })  // fire-and-forget
  → Return { processed: 5 }

POST /api/queue/process { setId, batchStart: 5 }
  → Process images 5-9
  → fetch('/api/queue/process', { setId, batchStart: 10 })
  → Return { processed: 5 }

  ... until all images in this set done
```

When the user generates N sets, `/api/generate` creates all sets and kicks off queue processing for each set in parallel.

Each batch stays well under 300s. Progress updates happen per-image via Supabase Realtime.

#### Partial Failure Handling

- If some slides fail (content policy rejection, API error, timeout), the system delivers **partial results**
- Successfully generated slides are shown normally
- Failed slides are marked with an error indicator and reason
- User can **retry individual failed slides** without re-generating the entire set

#### Output Display

- Original images shown at the top in a scrollable row
- Below: all generated sets in a **vertically scrollable view**
- Each set is a horizontal row of its slides with a **per-set download button** (ZIP of individual images)
- Layout allows easy visual comparison between original and generated versions

#### Generation History

All generation sets are **preserved permanently**. If the user generates 5 sets today and 3 sets tomorrow with different prompts, all 8 sets remain viewable and downloadable.

#### Scheduling Controls

- **Channel selector**: dropdown to assign this carousel to a TikTok account (references the existing `project_accounts` table in Supabase)
- **Posting time**: date/time picker for when this content should be posted
- These are for organizational/calendar purposes only — no auto-posting

---

### 3. Calendar View

A visual scheduling interface for planning content posting across channels.

**Views:** Toggle between **day**, **week**, and **month** views.

**Calendar entries show:**
- Carousel thumbnail (first slide of the selected generated set)
- Scheduled posting time
- Channel label/avatar

**Interactions:**
- **Drag-and-drop** to reschedule entries across all view types
- Click an entry to expand details or navigate to the carousel's Generate page
- Filter by channel

**Implementation:** FullCalendar loaded via `next/dynamic` with `ssr: false`. CSS overrides in `globals.css` for Warm Mem aesthetic (rounded pills, warm colors). Custom event renderer shows thumbnail + channel label.

**Note:** This is a visual planning tool only. The user manually downloads and posts content at the scheduled time. No auto-posting integration.

---

## Supabase Schema

> **Key design decisions:**
> 1. `scheduled_posts` merged into `generation_sets` — each set = one post to one channel
> 2. `generation_runs` merged into `generation_sets` — flattened to 2-level schema (`generation_sets` → `generated_images`)
> 3. Reuse existing `videos` table (14,706 rows) instead of creating a redundant `carousels` table — same data: `url`, `description`, `hashtags`, `views`, `likes`, `comments`, `shares`, `account_id`, `posted_at`
> 4. Reuse existing `project_accounts` table instead of a separate `channels` table
>
> **Total: 2 new tables + 2 existing = 4 tables**

### `videos` table (existing — 14,706 rows)

Already contains carousel/post metadata: `id`, `url`, `description`, `hashtags`, `views`, `likes`, `comments`, `shares`, `account_id`, `posted_at`, etc.

**One new column added:**

| Column | Type | Description |
|---|---|---|
| `original_images` | `text[]` | Array of Supabase Storage URLs for fetched original slide images (added via ALTER TABLE) |

Dedup/auto-merge uses the existing `videos.url` column (already populated for all 14,706 rows).

### `project_accounts` table (existing)

Used as scheduling channels. Already contains account metadata (username, etc.). Referenced by `generation_sets.channel_id`.

### `generation_sets` table (new — includes run config + scheduling)

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Unique set identifier |
| `video_id` | `uuid` (FK → videos.id) | Parent video/carousel |
| `set_index` | `integer` | 0-based index for ordering sets from the same generation action |
| `batch_id` | `uuid` | Groups sets created from one "Generate" click (not a FK, just a grouping UUID) |
| **Generation config** | | |
| `first_slide_prompt` | `text` | Prompt used for slide 1 |
| `other_slides_prompt` | `text` | Prompt used for slides 2+ |
| `quality_input` | `text` | Input image fidelity (`low` / `high`) |
| `quality_output` | `text` | Output quality (`low` / `medium` / `high`) |
| `output_format` | `text` | `png`, `jpeg`, or `webp` |
| `selected_slides` | `integer[]` | Indexes of slides selected for generation |
| **Progress** | | |
| `status` | `text` | `queued`, `processing`, `completed`, `partial`, `failed` |
| `progress_current` | `integer` | Images completed so far (drives Realtime progress bar) |
| `progress_total` | `integer` | Total images to generate in this set |
| **Scheduling** | | |
| `channel_id` | `uuid` (FK → project_accounts.id, nullable) | Target TikTok account for scheduling |
| `scheduled_at` | `timestamptz` (nullable) | When to post (appears on calendar when set) |
| `notes` | `text` | Optional scheduling notes |
| **Timestamps** | | |
| `created_at` | `timestamptz` | When this set was created |
| `updated_at` | `timestamptz` | Last update timestamp |

### `generated_images` table

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Unique image identifier |
| `set_id` | `uuid` (FK → generation_sets.id) | Parent set |
| `slide_index` | `integer` | 0-based position within the carousel |
| `image_url` | `text` | Supabase Storage URL for the generated image |
| `per_slide_prompt` | `text` | Individual prompt used for this slide (if any) |
| `overlay_image_url` | `text` | Supabase Storage URL for the overlay image used (if any) |
| `status` | `text` | `pending`, `generating`, `completed`, `failed` |
| `error_message` | `text` | Error reason if generation failed |
| `created_at` | `timestamptz` | When this image was generated |

### Storage Buckets

- `originals` — fetched TikTok carousel images
- `generated` — AI-generated images (metadata stripped)
- `overlays` — user-uploaded overlay images
- All public (URLs use UUID paths, single-user tool)

### Realtime

Enabled on `generation_sets` and `generated_images` tables for live progress tracking.

### Indexes

- `videos(url)` — already exists (used for dedup)
- `generation_sets(video_id)`, `generation_sets(batch_id)`, `generation_sets(status)`
- Partial index: `generation_sets(scheduled_at)` WHERE `scheduled_at IS NOT NULL`
- Partial index: `generation_sets(channel_id)` WHERE `channel_id IS NOT NULL`
- `generated_images(set_id, status)`

### Migration SQL

```sql
-- Add original_images column to existing videos table
ALTER TABLE videos ADD COLUMN original_images text[];

-- generation_sets (new table)
CREATE TABLE generation_sets (
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

-- generated_images (new table)
CREATE TABLE generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES generation_sets(id),
  slide_index integer NOT NULL,
  image_url text,
  per_slide_prompt text,
  overlay_image_url text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_generation_sets_video_id ON generation_sets(video_id);
CREATE INDEX idx_generation_sets_batch_id ON generation_sets(batch_id);
CREATE INDEX idx_generation_sets_status ON generation_sets(status);
CREATE INDEX idx_generation_sets_scheduled ON generation_sets(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_generation_sets_channel ON generation_sets(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_generated_images_set_status ON generated_images(set_id, status);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE generation_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE generated_images;
```

### Table Mapping Summary

| Spec (Old) | Supabase (Actual) | Action |
|------------|-------------------|--------|
| `carousels` (new) | `videos` (existing, 14,706 rows) | Reuse, add `original_images` column |
| `channels` (existing ref) | `project_accounts` (existing) | Reuse as-is |
| `generation_sets` (new) | — | Create new table |
| `generated_images` (new) | — | Create new table |

### FK Relationships

```
videos (existing)
  └── generation_sets.video_id → videos.id (new)
        ├── generation_sets.channel_id → project_accounts.id
        └── generated_images.set_id → generation_sets.id (new)
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/tiktok/fetch` | POST | Fetch TikTok carousel → check dedup in `videos` table → store → return video (auto-merge if URL exists) |
| `/api/videos` | GET | List all videos with engagement metrics and generation counts |
| `/api/videos/[id]` | GET | Single video with all sets and images (nested) |
| `/api/generate` | POST | Create generation_sets + generated_images → trigger queue processing per set |
| `/api/generate/[imageId]/retry` | POST | Retry single failed image |
| `/api/images/[setId]/download` | GET | ZIP download of all completed images in a set |
| `/api/schedule` | GET/POST/PUT/DELETE | CRUD on generation_sets scheduling fields (`channel_id`, `scheduled_at`, `notes`) |
| `/api/project-accounts` | GET | List project accounts (channels) from existing table |
| `/api/stats` | GET | Total videos, sets, images, estimated API cost |
| `/api/queue/process` | POST | Internal: process a batch of images for a set (self-chaining for Vercel compatibility) |

---

## Analytics (Basic Stats)

Displayed as a summary bar or small widget (not a dedicated page):
- Total videos saved
- Total generation sets
- Total images generated
- Estimated API cost (based on image count x gpt-image-1.5 pricing per quality level)

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# RapidAPI
RAPIDAPI_KEY=
RAPIDAPI_TIKTOK_HOST=tiktok-api23.p.rapidapi.com

# Defaults
DEFAULT_FIRST_SLIDE_PROMPT=
DEFAULT_OTHER_SLIDES_PROMPT=
DEFAULT_OUTPUT_QUALITY=medium
DEFAULT_OUTPUT_FORMAT=png
```

---

## UI/UX Notes

- **Aesthetic**: Warm Mem-inspired — soft gradients, rounded corners, muted warm tones (cream, soft orange, warm gray), generous whitespace
- **Theme Colors**: Background `#FFF9F5`, Primary `#E8825F`, Secondary `#F5E6D8`, Muted `#F0E7DE`, Accent `#D4956B`, Border `#E8DDD4`
- **Border Radius**: `0.75rem` default, `1rem` lg, `1.25rem` xl
- **Responsive**: Desktop-first (primary use case), but layouts should be functional on tablet
- **Loading states**: Skeleton loaders for carousel fetching, animated progress bar for generation queue
- **Error states**: Inline error messages with specific failure reasons, never silent failures
- **Empty states**: Friendly illustrations/messages when no carousels exist yet
- **Toasts**: sonner for success/error notifications (generation complete, download ready, schedule saved)

---

## Implementation Plan

### Phase 0: Project Scaffolding

**Goal:** Running Next.js app with all deps, Tailwind theme, folder structure.

1. `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
2. Install dependencies:
   ```
   # Core
   @supabase/supabase-js @supabase/ssr openai sharp archiver sonner date-fns uuid

   # Calendar
   @fullcalendar/react @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

   # Dev
   @types/archiver @types/uuid
   ```
3. `npx shadcn@latest init` then add: `button input textarea select dialog dropdown-menu tooltip badge skeleton tabs separator calendar popover`
4. Configure Warm Mem theme in `tailwind.config.ts`
5. Create `.env.local` and `.env.example`
6. Set up folder structure

### Phase 1: Supabase Schema

SQL migration: `ALTER TABLE videos ADD COLUMN original_images text[]`, then create 2 new tables (`generation_sets`, `generated_images`), storage buckets, Realtime config, and indexes. The `videos` and `project_accounts` tables already exist — reuse as-is.

### Phase 2: Core Utilities

Files under `src/lib/`:

| File | Purpose |
|---|---|
| `supabase/client.ts` | Browser client using `createBrowserClient` from `@supabase/ssr` |
| `supabase/server.ts` | Server client using service role key (no auth, admin access) |
| `openai/client.ts` | OpenAI client instance |
| `openai/generate-image.ts` | Wrapper: original image + prompt + optional overlay → `gpt-image-1.5` edit endpoint |
| `tiktok/client.ts` | RapidAPI fetch: calls `tiktok-api23` `/api/post/detail` |
| `tiktok/parse-url.ts` | Extracts video ID from TikTok URLs (handles `/video/`, `/photo/`, `vm.tiktok.com`) |
| `metadata/strip.ts` | sharp-based: strips all metadata (EXIF, XMP, C2PA), resizes to 1080x1350, re-encodes |
| `storage/upload.ts` | Upload buffer to Supabase Storage bucket, return public URL |
| `storage/download.ts` | Download image from Supabase Storage URL as Buffer |
| `zip/create.ts` | archiver-based ZIP creation from list of storage URLs |
| `queue/processor.ts` | Core queue logic: process a batch of generated_images for a set |
| `queue/rate-limiter.ts` | Simple token-bucket rate limiter for OpenAI API (~5 RPM) |
| `utils/format.ts` | Number formatting (1.2M views, etc.) |

### Phase 3: API Routes

All 10 API routes as documented above. Queue processor uses self-chaining batches of ~5 images for Vercel compatibility.

### Phase 4: UI Components & Pages

**Layout:** `app-shell.tsx`, `tab-nav.tsx`, `stats-bar.tsx`

**Tab 1 — All Carousels:** Server component grid with `video-card.tsx`, `video-grid.tsx`

**Tab 2 — Generate:** Most complex page with:
- `url-input.tsx`, `manual-upload.tsx` (fallback)
- `video-meta-bar.tsx` (engagement stats)
- `slide-grid.tsx` + `slide-card.tsx` (original slides with toggle/prompt/overlay)
- `global-controls.tsx` (default prompts, quality, format, num sets)
- `schedule-controls.tsx` (channel dropdown, datetime picker)
- `generation-progress.tsx` (Supabase Realtime progress bar)
- `output-display.tsx` + `set-row.tsx` (generated sets with per-set ZIP download)
- `retry-button.tsx` (retry failed slides)

**Tab 3 — Calendar:** FullCalendar via `next/dynamic` with `ssr: false`:
- `calendar-view.tsx` (FullCalendar wrapper with day/week/month)
- `calendar-event.tsx` (custom event renderer: thumbnail + channel)
- `channel-filter.tsx`, `schedule-dialog.tsx`

**Shared:** `image-thumbnail.tsx`, `engagement-stats.tsx`, `empty-state.tsx`, `error-state.tsx`, `loading-skeleton.tsx`

**Hooks:** `use-generation-progress.ts`, `use-scheduled-events.ts`, `use-project-accounts.ts`, `use-video.ts`

### Phase 5: Queue Hardening

- Rate limiter: in-memory token bucket (~5 RPM)
- Batch size: 5 images per API call, self-chain to next batch
- Per-image error handling: catch failures, store error message, continue
- Set finalization: set status to `completed` / `partial` / `failed`
- Retry endpoint: reprocess single failed image, update set status

### Build Order

1. Phase 0 → 2. Phase 1 → 3. Phase 2 → 4. Phase 3 → 5. Phase 4 → 6. Phase 5

Each phase depends on the previous. Phases 4 and 5 can partially overlap.

---

## File Tree

```
contenthouse/
├── .env.local / .env.example
├── next.config.ts                    (maxDuration: 300)
├── tailwind.config.ts                (Warm Mem theme)
├── components.json                   (shadcn config)
├── supabase/migrations/              (6 SQL files)
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── videos/page.tsx
│   │   ├── generate/page.tsx, [id]/page.tsx
│   │   ├── calendar/page.tsx
│   │   └── api/ (10 route files)
│   ├── lib/ (12 utility modules)
│   ├── components/ (20+ components across layout/carousel/generate/calendar/shared)
│   ├── hooks/ (4 hooks)
│   └── types/ (database.ts, api.ts)
```

~50 files total.

---

## Verification

1. **TikTok Fetch:** Paste a real TikTok carousel URL → verify images load in Generate tab, metadata populates
2. **Image Generation:** Generate 1 set of a 3-slide carousel → verify images appear, progress bar works, metadata is stripped
3. **Partial Failure:** Test with a prompt that triggers content policy → verify partial results + retry works
4. **Multi-set:** Generate 3 sets → verify all display in scrollable view with per-set download
5. **ZIP Download:** Download a set → verify ZIP contains correct images in correct format
6. **Auto-merge:** Paste same URL twice → verify it loads existing carousel instead of creating duplicate
7. **Calendar:** Schedule a set → verify it appears on calendar, drag to reschedule → verify date updates
8. **Realtime:** Open Generate page, start generation, refresh page mid-generation → verify progress reconnects
9. **History:** Generate multiple sets for same carousel → verify all preserved and viewable
