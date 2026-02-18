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
- **AI:** OpenAI gpt-image-1 (images.edit endpoint)
- **TikTok:** RapidAPI tiktok-api23
- **Image Processing:** sharp (resize 1080x1350, strip metadata)
- **Calendar:** FullCalendar v6
- **Deployment:** Vercel (300s maxDuration constraint)

## Key Conventions

### File Organization
```
src/app/          — Pages and API routes (App Router)
src/lib/          — Server-side utilities (supabase, openai, tiktok, storage, metadata, queue, zip, utils)
src/hooks/        — Client-side React hooks
src/components/   — React components grouped by feature (layout, carousel, generate, calendar, dashboard, generated, shared, ui)
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
- **Storage:** 3 buckets: `originals`, `generated`, `overlays`. UUID filenames.
- **Image output:** Always strip metadata and resize to 1080x1350 via sharp before storing.
- **Rate limiting:** Token bucket at 5 req/min for OpenAI calls.

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
| `generation_sets` | Generation config, progress tracking, scheduling. `video_id` nullable (null for uploaded posts). Has `title` column. |
| `generated_images` | Individual AI-generated slide images |

3 storage buckets: `originals`, `generated`, `overlays`

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
| `/api/generation-sets` | GET/DELETE | List generation sets; bulk delete by IDs or status |
| `/api/generation-sets/[id]` | DELETE | Delete single generation set |
| `/api/projects` | GET | List projects with nested accounts |
| `/api/project-accounts` | GET | List TikTok channels with nested project |
| `/api/overlays` | GET | List existing overlays from storage |
| `/api/stats` | GET | Dashboard statistics (enhanced) |
| `/api/queue` | POST | Batch processor (self-chaining) |

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
```

## Supabase Config

- Project ref: `gqtdvbvwvkncvfqtgnzp`
- Migrations: `supabase/migrations/001_contenthouse_schema.sql`, `002_add_posted_at.sql`, `004_nullable_video_id.sql`
- RLS: Permissive (single-user, no auth)

## Testing

No test framework configured. Manual testing only.

## Deployment

- Platform: Vercel
- Queue constraint: Batches of 5 images, self-chaining via fetch() to stay under 300s
- Route-level `export const maxDuration = 300` on `/api/queue` and `/api/generate/[imageId]/retry`
