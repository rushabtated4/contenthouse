# ContentHouse - Claude Code Instructions

## Self-Updating Documentation Rule

**CRITICAL: After ANY code change, update the relevant documentation files below.** This is mandatory, not optional. Before finishing a task, check which docs are affected and update them. If you add/remove/modify an API route, component, hook, lib module, type, or env var — update the corresponding doc.

Documentation files to maintain:
- `CLAUDE.md` — This file (project rules, conventions, gotchas)
- `ARCHITECTURE.md` — Project structure tree, tech stack, schema, queue design
- `docs/API.md` — Every API route with request/response shapes
- `docs/COMPONENTS.md` — Component tree, props, state, hierarchy
- `docs/DATABASE.md` — Tables, columns, types, relationships, indexes, RLS
- `docs/DATA-FLOW.md` — End-to-end flows (fetch, generate, schedule, retry)
- `docs/LIBS.md` — All lib modules with exported functions and signatures
- `docs/TYPES.md` — All TypeScript interfaces and enums
- `docs/ENV.md` — All environment variables with descriptions

When updating docs, only change what's relevant — don't rewrite entire files for a one-line change.

---

## Project Overview

ContentHouse is a single-user TikTok carousel replication tool. It fetches TikTok carousels, generates AI variations of slides using OpenAI gpt-image-1, strips provenance metadata, and schedules posts via a calendar.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** Tailwind CSS v4 + shadcn/ui (new-york style) + Radix UI + Lucide icons
- **Database:** Supabase PostgreSQL + Realtime + Storage
- **AI:** OpenAI gpt-image-1.5 (images.edit endpoint), GPT-5.2 (vision/text extraction, structured output), Replicate (Nano Banana Pro for images, Kling v2.6 for video)
- **TikTok:** RapidAPI tiktok-api23
- **Image Processing:** sharp (resize 1080x1350, strip metadata, SVG text composite)
- **Canvas:** react-konva + konva (client-side slide editor)
- **State:** Zustand (editor store)
- **Calendar:** FullCalendar v6
- **Fonts:** DM Sans (public/fonts/)
- **Deployment:** Vercel (300s maxDuration constraint)

## Key Conventions

### File Organization
```
src/app/          — Pages and API routes (App Router)
src/lib/          — Server-side utilities (supabase, openai, tiktok, storage, metadata, queue, zip, editor, utils)
src/stores/       — Zustand stores (editor-store)
src/hooks/        — Client-side React hooks
src/components/   — React components grouped by feature (layout, carousel, generate, editor, calendar, dashboard, generated, shared, ui)
src/types/        — TypeScript type definitions
```

### Naming
- Files: kebab-case (`video-card.tsx`, `parse-url.ts`)
- Components: PascalCase (`VideoCard`, `SlideGrid`)
- Hooks: camelCase with `use` prefix (`useVideo`, `useGenerationProgress`)
- API routes: `route.ts` in nested folders matching URL path
- Types: PascalCase interfaces (`GenerationSet`, `VideoWithSets`)

### Patterns
- **Supabase clients:** Use `createServerClient()` from `lib/supabase/server.ts` in API routes. Use `createClient()` from `lib/supabase/client.ts` in client components.
- **OpenAI:** Singleton via `getOpenAIClient()` — lazy-initialized, cached in module scope.
- **API responses:** Always return `NextResponse.json()`. Errors use `{ error: string, details?: string }`.
- **Queue:** Self-chaining batches of 5 images. Fire-and-forget via `fetch()` to itself.
- **Storage:** 4 buckets: `originals`, `generated`, `overlays`, `backgrounds`. UUID filenames.
- **Image output:** Always strip metadata and resize to 1080x1350 via sharp before storing.
- **Rate limiting:** Token bucket at 50 req/min for OpenAI calls.

## Common Gotchas

- `maxDuration` is NOT a valid Next.js config property in v16 — use route-level `export const maxDuration = 300` in API routes that need it.
- `Buffer` can't be used directly in `new File()` — wrap in `new Uint8Array()` first.
- `Buffer` can't be passed to `new NextResponse()` — wrap in `new Uint8Array()`.
- FullCalendar v6: `EventDropArg` type not exported from `@fullcalendar/interaction` — use `any`.
- OpenAI key: Make sure `~/.zshrc` doesn't export an old `OPENAI_API_KEY` that overrides `.env.local`.
- Supabase `create-next-app` conflict: scaffold in temp dir, then copy over.
- `overlays` bucket images stored as blob URLs during session — not persisted to DB.

## Database Quick Reference

| Table | Purpose |
|---|---|
| `videos` | TikTok posts (14,706 rows). Added `original_images` text[] column. |
| `projects` | Project groupings for organizing accounts. Has `name`, `color`. |
| `project_accounts` | TikTok channels grouped by project. FK `project_id` → `projects`. Has `nickname`, `added_at`. |
| `generation_sets` | Generation config, progress tracking, scheduling. `video_id` nullable (null for uploaded posts). Has `title` column. `editor_state` JSONB for saved canvas state. `status` includes `editor_draft`. `review_status`: `unverified` (default) / `ready_to_post`. |
| `generated_images` | Individual AI-generated slide images |
| `background_library` | Saved backgrounds for editor mode. `source`: generated/uploaded. FK `source_video_id` → `videos`. FK `folder_id` → `background_folders`. |
| `background_folders` | Folders for organizing background library images. Has `name`, `created_at`, `updated_at`. |
| `hook_sessions` | Hook Creator wizard sessions. Stores input video, snapshot frame, wizard step, and final config. |
| `hook_generated_images` | Images generated by Replicate Nano Banana Pro for a hook session. |
| `hook_generated_videos` | Videos generated by Replicate Kling v2.6 for a hook session. Stores Replicate prediction ID, status, and output URL. |

6 storage buckets: `originals`, `generated`, `overlays`, `backgrounds`, `hook-videos`, `hook-images`

See `docs/DATABASE.md` for full schema.

## API Quick Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Password authentication (sets cookie) |
| `/api/tiktok` | POST | Fetch TikTok carousel & store originals |
| `/api/apps` | GET | List apps with nested accounts |
| `/api/videos` | GET | List videos with filters, accounts, generation counts |
| `/api/videos/[id]` | GET | Single video with nested sets & images |
| `/api/generate` | POST | Create generation batch & queue processing |
| `/api/generate/[imageId]/retry` | POST | Retry a single failed image |
| `/api/images/[setId]/download` | GET | Download ZIP of completed set |
| `/api/upload-post` | POST | Upload images directly to create scheduled post |
| `/api/schedule` | GET/POST/PUT/PATCH/DELETE | CRUD scheduling + mark as posted |
| `/api/generation-sets` | GET/PATCH/DELETE | List generation sets; update review status; bulk delete by IDs or status |
| `/api/generation-sets/[id]` | DELETE | Delete single generation set |
| `/api/projects` | GET | List projects with nested accounts |
| `/api/project-accounts` | GET | List TikTok channels with nested project |
| `/api/overlays` | GET/POST | List/upload overlays from storage |
| `/api/stats` | GET | Dashboard statistics (enhanced) |
| `/api/queue` | POST | Batch processor (self-chaining) |
| `/api/editor/extract-text` | POST | Extract text from slides via GPT-5.2 vision + structured output |
| `/api/editor/generate-background` | POST | Generate text-free background (single slide) |
| `/api/editor/generate-background/batch` | POST | Batch generate backgrounds |
| `/api/editor/export` | POST | Export editor slides as ZIP |
| `/api/editor/create-generation` | POST | Render all slides & insert new generated_images rows |
| `/api/editor/update-generation` | POST | Re-render dirty slides & overwrite generated_images |
| `/api/editor/save` | GET/PUT | Load/save editor canvas state (editor_draft) |
| `/api/backgrounds` | GET/POST | List/upload backgrounds (GET supports `folderId` filter) |
| `/api/backgrounds/[id]` | DELETE | Delete background |
| `/api/backgrounds/folders` | GET/POST | List/create background folders |
| `/api/backgrounds/folders/[id]` | PATCH/DELETE | Rename/delete background folder |
| `/api/backgrounds/upload-batch` | POST | Multi-upload files to folder (multipart, maxDuration=300) |
| `/api/hooks/sessions` | GET/POST | List/create hook creator sessions |
| `/api/hooks/sessions/[id]` | GET/PATCH/DELETE | Get/update/delete a hook session |
| `/api/hooks/sessions/[id]/snapshot` | POST | Extract a snapshot frame from the session video |
| `/api/hooks/sessions/[id]/generate-images` | POST | Generate hook images via Replicate Nano Banana Pro |
| `/api/hooks/sessions/[id]/generate-images/retry` | POST | Retry a failed hook image |
| `/api/hooks/sessions/[id]/select-images` | PATCH | Mark selected images and advance wizard step |
| `/api/hooks/sessions/[id]/generate-videos` | POST | Generate hook videos via Replicate Kling v2.6 |
| `/api/hooks/tiktok-video` | POST | Download TikTok video for hook input |
| `/api/hooks/webhook` | POST | Replicate webhook receiver (updates prediction status) |
| `/api/hooks/library` | GET | List all completed hook videos |
| `/api/hooks/videos/[id]` | PATCH/DELETE | Update/delete a hook video |
| `/api/hooks/videos/[id]/download` | GET | Download a hook video |

See `docs/API.md` for full request/response shapes.

## Environment Variables

See `docs/ENV.md` for full list. Required:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
RAPIDAPI_KEY
RAPIDAPI_TIKTOK_HOST
REPLICATE_API_TOKEN
REPLICATE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
```

## Supabase Config

- Project ref: `gqtdvbvwvkncvfqtgnzp`
- Migrations: `001_contenthouse_schema.sql`, `002_add_posted_at.sql`, `003_videos_carousel_index.sql`, `004_nullable_video_id.sql`, `005_add_projects_table.sql`, `006_account_posting_schedule.sql`, `007_background_library.sql`, `008_editor_state.sql`, `009_review_status.sql`, `010_hook_creator.sql`, `011_background_folders.sql`
- RLS: Permissive (single-user, no auth)

## Testing

No test framework configured. Manual testing only.

## Deployment

- Platform: Vercel
- Queue constraint: Batches of 5 images, self-chaining via fetch() to stay under 300s
- Route-level `export const maxDuration = 300` on `/api/queue`, `/api/generate/[imageId]/retry`, `/api/editor/generate-background/batch`, and `/api/backgrounds/upload-batch`
