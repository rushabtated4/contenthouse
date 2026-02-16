# ContentHouse - Architecture Documentation

## Overview

ContentHouse is a single-user TikTok carousel replication tool built with Next.js (App Router). It fetches carousel data from TikTok via RapidAPI, generates new visually-similar images using OpenAI's image generation API, strips all AI provenance metadata, and organizes scheduled posts in a calendar view.

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | Full-stack framework |
| Tailwind CSS v4 + shadcn/ui | UI styling & components |
| Supabase (Postgres) | Database & file storage |
| Supabase Realtime | Live generation progress |
| OpenAI gpt-image-1 | AI image generation |
| RapidAPI tiktok-api23 | TikTok data fetching |
| FullCalendar v6 | Calendar scheduling UI |
| sharp | Image processing & metadata stripping |
| archiver | Server-side ZIP creation |
| sonner | Toast notifications |

## Project Structure

```
contenthouse/
├── .env.local                        # Environment variables (secrets)
├── .env.example                      # Template for env vars
├── next.config.ts                    # Next.js config (image domains)
├── components.json                   # shadcn/ui config
├── supabase/
│   └── migrations/
│       └── 001_contenthouse_schema.sql  # Full DB migration
├── scripts/
│   └── run-migration.mjs            # Migration runner script
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout (Toaster, TooltipProvider)
│   │   ├── page.tsx                  # Redirect to /dashboard
│   │   ├── globals.css               # Warm Mem theme + FullCalendar overrides
│   │   ├── (app)/                    # Route group — shared AppShell layout
│   │   │   ├── layout.tsx            # AppShell wrapper (sidebar persists across pages)
│   │   │   ├── dashboard/page.tsx    # Dashboard with stats, activity, quick actions
│   │   │   ├── videos/page.tsx       # Source Carousels grid
│   │   │   ├── generate/
│   │   │   │   ├── page.tsx          # Generate (new carousel)
│   │   │   │   └── [id]/page.tsx     # Generate (existing carousel)
│   │   │   ├── generated/page.tsx    # Generated carousels with filters/pagination
│   │   │   ├── calendar/page.tsx     # Calendar + list view with posted tracking
│   │   │   └── accounts/page.tsx     # Project accounts list
│   │   ├── login/page.tsx            # Login page (password gate)
│   │   └── api/
│   │       ├── auth/login/route.ts   # POST: Password authentication
│   │       ├── tiktok/route.ts       # POST: Fetch TikTok carousel
│   │       ├── videos/route.ts       # GET: List all videos
│   │       ├── videos/[id]/route.ts  # GET: Single video with sets
│   │       ├── generate/route.ts     # POST: Create generation sets
│   │       ├── generate/[imageId]/retry/route.ts  # POST: Retry failed image
│   │       ├── images/[setId]/download/route.ts   # GET: ZIP download
│   │       ├── schedule/route.ts     # CRUD + PATCH: Scheduling + mark as posted
│   │       ├── generation-sets/route.ts  # GET: List generation sets
│   │       ├── projects/route.ts         # GET: List projects with accounts
│   │       ├── project-accounts/route.ts  # GET: List channels with project
│   │       ├── stats/route.ts        # GET: Enhanced analytics summary
│   │       └── queue/route.ts        # POST: Queue batch processor
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   └── server.ts             # Server-side Supabase client (service role)
│   │   ├── openai/
│   │   │   ├── client.ts             # OpenAI client singleton
│   │   │   └── generate-image.ts     # Image generation wrapper
│   │   ├── tiktok/
│   │   │   ├── client.ts             # RapidAPI TikTok data fetcher
│   │   │   └── parse-url.ts          # URL parser (video/photo/short URLs)
│   │   ├── metadata/
│   │   │   └── strip.ts              # sharp: strip EXIF/XMP/C2PA, resize to 1080x1350
│   │   ├── storage/
│   │   │   ├── upload.ts             # Upload to Supabase Storage
│   │   │   └── download.ts           # Download image as Buffer
│   │   ├── zip/
│   │   │   └── create.ts             # archiver ZIP creation
│   │   ├── queue/
│   │   │   ├── processor.ts          # Batch image processing logic
│   │   │   └── rate-limiter.ts       # Token-bucket rate limiter (~5 RPM)
│   │   ├── utils/
│   │   │   └── format.ts             # Number formatting, cost estimation
│   │   └── utils.ts                  # shadcn cn() utility
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (18 components)
│   │   ├── layout/
│   │   │   ├── app-shell.tsx          # SidebarProvider + sidebar + main content
│   │   │   ├── app-sidebar.tsx        # Left nav with 6 items (collapsible)
│   │   │   └── stats-bar.tsx          # Stats widget (legacy, kept for reference)
│   │   ├── carousel/
│   │   │   ├── video-card.tsx         # Carousel card with hover regenerate
│   │   │   └── video-grid.tsx         # Grid layout with loading/empty states
│   │   ├── generate/
│   │   │   ├── url-input.tsx          # TikTok URL input with fetch button
│   │   │   ├── manual-upload.tsx      # Drag-and-drop fallback upload
│   │   │   ├── video-meta-bar.tsx     # Engagement stats + hashtags bar
│   │   │   ├── slide-card.tsx         # Individual slide with toggle/prompt/overlay
│   │   │   ├── slide-grid.tsx         # Grid of slide cards
│   │   │   ├── global-controls.tsx    # Prompts, quality, format, generate button
│   │   │   ├── generation-progress.tsx # Realtime progress bar
│   │   │   ├── output-display.tsx     # Generated sets with download + retry
│   │   │   └── schedule-controls.tsx  # Channel + datetime picker
│   │   ├── dashboard/
│   │   │   ├── dashboard.tsx          # Main dashboard layout with stats + activity
│   │   │   ├── stat-card.tsx          # Reusable stat card with icon
│   │   │   ├── recent-activity.tsx    # Last 10 generation sets list
│   │   │   └── quick-actions.tsx      # Quick action buttons
│   │   ├── generated/
│   │   │   ├── generated-grid.tsx     # Filter bar + grid + pagination
│   │   │   └── generated-set-card.tsx # Card with thumbnail, status, description
│   │   ├── calendar/
│   │   │   ├── calendar-view.tsx      # Calendar/list toggle + filter tabs
│   │   │   ├── fullcalendar-wrapper.tsx # FullCalendar with custom event content
│   │   │   └── schedule-list.tsx      # List view with mark-as-done buttons
│   │   ├── accounts/
│   │   │   └── account-list.tsx       # Project accounts list (read-only)
│   │   └── shared/
│   │       ├── engagement-stats.tsx   # Views/likes/comments/shares display
│   │       ├── image-thumbnail.tsx    # Next/Image thumbnail wrapper
│   │       ├── empty-state.tsx        # Empty state with illustration
│   │       ├── error-state.tsx        # Error state with retry button
│   │       └── loading-skeleton.tsx   # Skeleton loaders
│   ├── hooks/
│   │   ├── use-video.ts              # Fetch single video with sets
│   │   ├── use-generation-progress.ts # Supabase Realtime progress tracking
│   │   ├── use-projects.ts           # Fetch projects with accounts
│   │   ├── use-project-accounts.ts   # Fetch channel list with project
│   │   ├── use-scheduled-events.ts   # Fetch calendar events (with posted status)
│   │   ├── use-dashboard-stats.ts    # Fetch enhanced dashboard stats
│   │   ├── use-generated-sets.ts     # Fetch generation sets with filters
│   │   └── use-mobile.ts            # shadcn mobile detection hook
│   └── types/
│       ├── database.ts               # TypeScript types for all tables
│       └── api.ts                    # Request/response types for API routes
```

## Database Schema

### Tables

| Table | Status | Purpose |
|---|---|---|
| `videos` | Existing (14,706 rows) | TikTok post metadata + `original_images` column |
| `projects` | Existing | Project groupings for organizing accounts |
| `project_accounts` | Existing | Scheduling channels, grouped by project |
| `generation_sets` | New | Generation config, progress, scheduling |
| `generated_images` | New | Individual generated image records |

### Storage Buckets

| Bucket | Purpose |
|---|---|
| `originals` | Fetched TikTok carousel images |
| `generated` | AI-generated images (metadata stripped) |
| `overlays` | User-uploaded overlay images |

### Relationships

```
projects
  └── project_accounts.project_id → projects.id

videos (existing)
  └── generation_sets.video_id → videos.id
        ├── generation_sets.channel_id → project_accounts.id
        └── generated_images.set_id → generation_sets.id
```

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/tiktok` | POST | Fetch TikTok carousel, dedup, store originals |
| `/api/videos` | GET | List all videos with generation counts |
| `/api/videos/[id]` | GET | Single video with nested sets + images |
| `/api/generate` | POST | Create generation sets, kick off queue |
| `/api/generate/[imageId]/retry` | POST | Retry single failed image |
| `/api/images/[setId]/download` | GET | ZIP download of completed set |
| `/api/schedule` | GET/POST/PUT/PATCH/DELETE | CRUD scheduling + mark as posted |
| `/api/generation-sets` | GET | List generation sets with filters/pagination |
| `/api/projects` | GET | List projects with nested accounts |
| `/api/project-accounts` | GET | List channels with nested project |
| `/api/stats` | GET | Enhanced analytics summary |
| `/api/queue` | POST | Batch processor (self-chaining) |

## Queue Architecture

Designed for Vercel's 300s `maxDuration` limit:

1. `/api/generate` creates all sets + image records, fires `/api/queue` per set
2. `/api/queue` processes a batch of ~5 images per invocation
3. After processing, it fire-and-forgets the next batch via `fetch()` to itself
4. Progress updates happen per-image via Supabase Realtime
5. Client subscribes to Realtime changes for live progress bars

## UI Theme

**Warm Mem aesthetic** with these design tokens:

| Token | Value |
|---|---|
| Background | `#FFF9F5` |
| Primary | `#E8825F` |
| Secondary | `#F5E6D8` |
| Muted | `#F0E7DE` |
| Accent | `#D4956B` |
| Border | `#E8DDD4` |
| Border Radius | `0.75rem` default |

## Key Flows

### Fetching a TikTok Carousel
1. User pastes URL → `/api/tiktok` checks `videos.url` for dedup
2. If exists: returns existing record, redirects to `/generate/[id]`
3. If new: calls RapidAPI, downloads images to `originals` bucket, inserts video record

### Generating Images
1. User configures prompts, quality, format, selects slides
2. Click "Generate" → `/api/generate` creates N sets + image records
3. Queue processor runs batches of 5, calling OpenAI per image
4. Each generated image is stripped of metadata via sharp, resized to 1080x1350
5. Uploaded to `generated` bucket, status updated via Supabase (triggers Realtime)
6. Client shows live progress bars via `useGenerationProgress` hook

### Calendar Scheduling
1. User picks channel + datetime on completed sets
2. Saved via `/api/schedule` to `generation_sets.channel_id` + `scheduled_at`
3. Calendar page queries all scheduled sets, renders in FullCalendar or list view
4. Drag-and-drop updates `scheduled_at` via PUT
5. "Mark as Posted" sets `posted_at` via PATCH — posted events show green in calendar

## Detailed Documentation

| Document | Contents |
|---|---|
| `CLAUDE.md` | Project rules, conventions, gotchas, self-update instructions |
| `docs/API.md` | All API routes with request/response shapes |
| `docs/DATABASE.md` | Full schema: tables, columns, indexes, RLS, triggers |
| `docs/COMPONENTS.md` | Component tree, props, state, hierarchy |
| `docs/DATA-FLOW.md` | End-to-end flows with ASCII diagrams |
| `docs/LIBS.md` | All lib modules with function signatures |
| `docs/TYPES.md` | All TypeScript interfaces and types |
| `docs/ENV.md` | Environment variables with descriptions and setup |
