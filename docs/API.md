# API Reference

> **Auto-update rule:** When any API route is added, removed, or modified, update this file. See `CLAUDE.md` for details.

## POST /api/tiktok

Fetch a TikTok carousel post and store original images.

**File:** `src/app/api/tiktok/route.ts`

**Request:**
```json
{
  "url": "https://www.tiktok.com/@user/video/123456"
}
```

Supported URL formats:
- `https://www.tiktok.com/@user/video/ID`
- `https://www.tiktok.com/@user/photo/ID`
- `https://vm.tiktok.com/CODE/`
- `https://www.tiktok.com/t/CODE/`

**Response (200):**
```json
{
  "video": {
    "id": "uuid",
    "video_id": "123456",
    "url": "https://www.tiktok.com/...",
    "description": "string",
    "hashtags": ["tag1", "tag2"],
    "views": 1000,
    "likes": 100,
    "comments": 50,
    "shares": 10,
    "posted_at": "2026-01-15T00:00:00.000Z",
    "original_images": ["https://storage.supabase.co/..."],
    "created_at": "2026-01-20T12:00:00.000Z"
  },
  "isExisting": false
}
```

**Errors:**
- `400` — Invalid URL or not a carousel post
- `404` — Post not found on TikTok
- `500` — TikTok API or storage failure

**Flow:**
1. Validate TikTok URL format
2. Check `videos.url` for dedup → return existing if found
3. Call RapidAPI TikTok `post/detail` endpoint
4. Verify post has carousel images (`imagePost.images`)
5. Download each image from TikTok CDN
6. Upload to `originals` bucket
7. Insert into `videos` table with `original_images` URLs

---

## GET /api/apps

List all apps with nested accounts.

**File:** `src/app/api/apps/route.ts`

**Response (200):**
```json
{
  "apps": [
    {
      "id": "uuid",
      "name": "App Name",
      "color": "#E8825F",
      "created_at": "ISO timestamp",
      "accounts": [
        {
          "id": "uuid",
          "username": "handle",
          "nickname": "Display Name",
          "app_id": "uuid",
          "sec_uid": "string",
          "sync_status": "string",
          "last_video_count": 100,
          "created_at": "ISO timestamp"
        }
      ]
    }
  ]
}
```

---

## GET /api/videos

List carousel videos with generation counts and account info (paginated). Only returns videos where `original_images` is populated (i.e., actual carousels).

**File:** `src/app/api/videos/route.ts`

**Query Params:**
- `page` — Page number (default: 1)
- `limit` — Results per page (default: 24, max: 50)
- `app_id` — Filter by app (resolves to account IDs internally)
- `account_id` — Filter by specific account
- `search` — Search descriptions (ilike)
- `min_views` — Minimum view count
- `date_from` — Filter videos created after this ISO date
- `date_to` — Filter videos created before this ISO date
- `sort` — Sort order: `newest` (posted_at desc, default), `oldest` (posted_at asc), `most_views` (views desc)
- `max_gen_count` — Exclusive upper bound on generation count (1=Fresh/0 gens, 2=<2 gens, 5=<5 gens)
- `min_gen_count` — Inclusive lower bound on generation count (1=has at least 1 generation)

**Response (200):**
```json
{
  "videos": [
    {
      "id": "uuid",
      "video_id": "123456",
      "url": "string",
      "description": "string",
      "hashtags": ["tag"],
      "views": 1000,
      "likes": 100,
      "comments": 50,
      "shares": 10,
      "posted_at": "ISO timestamp",
      "original_images": ["url1", "url2"],
      "created_at": "ISO timestamp",
      "generation_count": 3,
      "account": {
        "id": "uuid",
        "username": "handle",
        "nickname": "Display Name",
        "app": { "id": "uuid", "name": "App Name", "color": "#E8825F" }
      }
    }
  ],
  "total": 14706,
  "page": 1,
  "limit": 24,
  "hasMore": true
}
```

**Notes:**
- `generation_count` is computed from `generation_sets` join
- `account` is joined from `accounts` table with nested `apps`
- All filter params are optional — existing callers unaffected
- Ordered by `sort` param: `newest`=`posted_at` desc (default), `oldest`=`posted_at` asc, `most_views`=`views` desc. Nulls last for all orderings.
- `max_gen_count` filter: pre-queries `generation_sets` table, builds a count map in JS, excludes video IDs with count ≥ max_gen_count
- `min_gen_count` filter: same pre-query, includes only video IDs with count ≥ min_gen_count; returns empty if no matches

---

## GET /api/videos/[id]

Fetch a single video with all generation sets and images.

**File:** `src/app/api/videos/[id]/route.ts`

**Response (200):**
```json
{
  "id": "uuid",
  "video_id": "123456",
  "original_images": ["url1", "url2"],
  "generation_sets": [
    {
      "id": "set-uuid",
      "set_index": 0,
      "batch_id": "batch-uuid",
      "status": "completed",
      "progress_current": 3,
      "progress_total": 3,
      "first_slide_prompt": "...",
      "other_slides_prompt": "...",
      "quality_input": "low",
      "quality_output": "medium",
      "output_format": "jpeg",
      "selected_slides": [0, 1, 2],
      "channel_id": null,
      "scheduled_at": null,
      "generated_images": [
        {
          "id": "img-uuid",
          "slide_index": 0,
          "image_url": "https://storage.supabase.co/...",
          "status": "completed",
          "error_message": null
        }
      ]
    }
  ],
  "generation_count": 1
}
```

**Errors:**
- `404` — Video not found

---

## POST /api/generate

Create generation batch and queue processing.

**File:** `src/app/api/generate/route.ts`

**Request:**
```json
{
  "videoId": "uuid",
  "selectedSlides": [0, 1, 2],
  "firstSlidePrompt": "Create a TikTok slide variation...",
  "otherSlidesPrompt": "This is a TikTok carousel slide...",
  "perSlidePrompts": {
    "0": "Custom prompt for slide 0"
  },
  "perSlideOverlays": {
    "0": "https://storage.url/overlay.png"
  },
  "qualityInput": "low",
  "qualityOutput": "medium",
  "outputFormat": "jpeg",
  "numSets": 2
}
```

**Response (200):**
```json
{
  "batchId": "uuid",
  "sets": [
    {
      "id": "set-uuid",
      "status": "queued",
      "progress_current": 0,
      "progress_total": 3
    }
  ]
}
```

**Flow:**
1. Create `generation_sets` records (one per `numSets`)
2. Create `generated_images` records for each selected slide in each set
3. Use `after()` (Next.js 15.1+) to run post-response: call `processBatch(set.id, 0)` directly; if `hasMore`, chain to `POST /api/queue` via HTTP for subsequent batches
4. Return `batchId` for progress tracking

**Note:** `after()` + direct `processBatch` for batch 0 replaces the old fire-and-forget `fetch()` — eliminates silent failures in local dev where self-referential HTTP calls could be dropped before the handler was invoked.

---

## POST /api/queue

Process a batch of images. Self-chains for Vercel compatibility.

**File:** `src/app/api/queue/route.ts`
**Max Duration:** 300s (route-level export)

**Request:**
```json
{
  "setId": "uuid",
  "batchStart": 0
}
```

**Response (200):**
```json
{
  "processed": 5,
  "hasMore": true,
  "nextBatchStart": 5
}
```

**Processing per image:**
1. Download original image from `originals` bucket
2. Download overlay if present
3. Determine prompt: per-slide → first-slide (index 0) → other-slides
4. Call OpenAI `images.edit()` with gpt-image-1
5. Strip metadata and resize to 1080x1350 via sharp
6. Upload to `generated` bucket
7. Update `generated_images` record (status, image_url)
8. Rate limit: 5 requests/minute (token bucket)

**Self-chaining:** If `hasMore`, fires next batch via `fetch()` to itself asynchronously.

---

## POST /api/generate/[imageId]/retry

Retry a single failed image generation.

**File:** `src/app/api/generate/[imageId]/retry/route.ts`
**Max Duration:** 300s

**Response (200):**
```json
{ "success": true }
```

**Flow:**
1. Find failed `generated_images` record
2. Re-download original + overlay
3. Call OpenAI again
4. Strip metadata, resize, upload
5. Update image record
6. Recalculate parent set status (`partial` → `completed` if all pass)

---

## GET /api/images/[setId]/download

Download a ZIP file of all completed images in a set.

**File:** `src/app/api/images/[setId]/download/route.ts`

**Response:** Binary ZIP file
**Content-Type:** `application/zip`
**Filename:** `set_{setIndex}_slides.zip`

ZIP contents: `slide_1.{format}`, `slide_2.{format}`, etc.

---

## GET /api/schedule

Fetch scheduled generation sets.

**File:** `src/app/api/schedule/route.ts`

**Query Params:**
- `channelId` (optional) — Filter by channel
- `filter` (optional) — `all` (default), `upcoming` (not posted), `posted` (posted_at not null)

**Response (200):**
```json
[
  {
    "id": "set-uuid",
    "scheduled_at": "2026-02-20T10:00:00.000Z",
    "channel_id": "channel-uuid",
    "notes": "string",
    "set_index": 0,
    "videos": {
      "id": "video-uuid",
      "url": "string",
      "description": "string",
      "original_images": ["url"]
    },
    "generated_images": [
      { "id": "img-uuid", "slide_index": 0, "image_url": "url", "status": "completed" }
    ]
  }
]
```

## POST /api/schedule

Schedule a generation set for posting.

**Request:**
```json
{
  "setId": "uuid",
  "channelId": "uuid",
  "scheduledAt": "2026-02-20T10:00:00.000Z",
  "notes": "Morning post"
}
```

**Response (200):**
```json
{ "success": true }
```

## PUT /api/schedule

Update a scheduled event (calendar drag-drop).

**Request:**
```json
{
  "setId": "uuid",
  "scheduledAt": "2026-02-21T14:00:00.000Z"
}
```

## PATCH /api/schedule

Mark a generation set as posted or undo.

**Request:**
```json
{
  "setId": "uuid",
  "posted": true
}
```

**Response (200):** Updated generation set record (with `posted_at` set to now or null).

---

## DELETE /api/schedule

Remove schedule from a set.

**Request:**
```json
{ "setId": "uuid" }
```

---

## GET /api/generation-sets

List generation sets with filtering and pagination.

**File:** `src/app/api/generation-sets/route.ts`

**Query Params:**
- `status` — `all` (default), `completed`, `partial`, `failed`, `queued`. Supports comma-separated values (e.g. `completed,partial`)
- `scheduled` — `true` (only scheduled), `false` (only unscheduled), omitted (no filter)
- `sort` — `newest` (default), `oldest`
- `page` — Page number (default: 1)
- `limit` — Results per page (default: 20, max: 50)

**Response (200):**
```json
{
  "sets": [
    {
      "id": "set-uuid",
      "video_id": "video-uuid",
      "set_index": 0,
      "status": "completed",
      "progress_current": 3,
      "progress_total": 3,
      "channel_id": null,
      "scheduled_at": null,
      "posted_at": null,
      "created_at": "ISO timestamp",
      "generated_images": [...],
      "videos": {
        "id": "video-uuid",
        "url": "string",
        "description": "string",
        "original_images": ["url"]
      },
      "channel": {
        "id": "account-uuid",
        "username": "myaccount",
        "nickname": "My Account"
      }
    }
  ],
  "total": 45,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

---

## DELETE /api/generation-sets

Bulk delete generation sets by IDs or by status.

**File:** `src/app/api/generation-sets/route.ts`

**Request (by IDs):**
```json
{ "ids": ["uuid1", "uuid2"] }
```

**Request (by status — partial or failed only):**
```json
{ "status": "failed" }
```

**Response (200):**
```json
{ "success": true, "deleted": 5 }
```

**Errors:**
- `400` — Missing `ids` or invalid `status`
- `500` — Database error

---

## DELETE /api/generation-sets/[id]

Delete a single generation set and its images (cascade via FK).

**File:** `src/app/api/generation-sets/[id]/route.ts`

**Response (200):**
```json
{ "success": true }
```

**Errors:**
- `500` — Database error

---

## GET /api/stats

Dashboard statistics.

**File:** `src/app/api/stats/route.ts`

**Response (200):**
```json
{
  "totalSets": 450,
  "completedSets": 400,
  "pendingSets": 15,
  "unscheduledSets": 85,
  "postedSets": 30,
  "accountStats": [
    {
      "id": "account-uuid",
      "username": "myaccount",
      "nickname": "My Account",
      "totalSets": 50,
      "completedSets": 45,
      "scheduledSets": 10,
      "postedSets": 5
    }
  ]
}
```

- `pendingSets` — Sets with status `queued` or `processing`
- `unscheduledSets` — Completed sets with no `scheduled_at` and no `posted_at`
- `accountStats` — Only includes accounts that have at least one generation set assigned

---

## POST /api/upload-post

Upload images directly to create a scheduled post without TikTok fetch + AI generation.

**File:** `src/app/api/upload-post/route.ts`
**Max Duration:** 60s

**Request:** `multipart/form-data`
- `images` — One or more image files (required)
- `title` — Optional string
- `channelId` — Optional UUID string
- `scheduledAt` — Optional ISO datetime string

**Response (200):**
```json
{
  "setId": "uuid",
  "videoId": null
}
```

**Errors:**
- `400` — No images provided or non-image files
- `500` — Storage or database failure

**Flow:**
1. Parse FormData, validate image files
2. For each image: strip metadata + resize via sharp, upload to `generated` bucket
3. Create completed `generation_sets` row with `video_id: null` and `title` field
4. Create completed `generated_images` rows
5. Return `{ setId, videoId: null }`

---

## GET /api/projects

List all projects with nested accounts.

**File:** `src/app/api/projects/route.ts`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Project Name",
    "color": "#E8825F",
    "created_at": "ISO timestamp",
    "updated_at": "ISO timestamp",
    "project_accounts": [
      {
        "id": "uuid",
        "project_id": "uuid",
        "username": "channel_name",
        "nickname": "Display Name",
        "added_at": "ISO timestamp"
      }
    ]
  }
]
```

---

## GET /api/project-accounts

List TikTok channels for scheduling, with nested project info.

**File:** `src/app/api/project-accounts/route.ts`

**Response (200):**
```json
[
  {
    "id": "uuid",
    "project_id": "uuid",
    "username": "channel_name",
    "nickname": "Display Name",
    "added_at": "ISO timestamp",
    "days_of_week": [1, 2, 3, 4, 5],
    "posts_per_day": 1,
    "projects": {
      "id": "uuid",
      "name": "Project Name",
      "color": "#E8825F",
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp"
    }
  }
]
```

---

## PATCH /api/project-accounts

Update posting schedule config for an account.

**File:** `src/app/api/project-accounts/route.ts`

**Request:**
```json
{
  "id": "uuid",
  "days_of_week": [1, 2, 3, 4, 5],
  "posts_per_day": 2
}
```

`days_of_week` uses JS `Date.getDay()` convention: 0=Sun, 1=Mon … 6=Sat.

**Response (200):** Updated `project_accounts` row.

**Errors:**
- `500` — DB update failure

---

## POST /api/auth/login

Simple password authentication.

**File:** `src/app/api/auth/login/route.ts`

**Request:**
```json
{
  "password": "string"
}
```

**Response (200):**
```json
{ "success": true }
```

Sets `ch_auth` httpOnly cookie (30-day expiry, secure in production, sameSite: lax).

**Errors:**
- `401` — Invalid password

---

## GET /api/overlays

List all existing overlay images from the `overlays` storage bucket.

**File:** `src/app/api/overlays/route.ts`

**Response (200):**
```json
{
  "overlays": [
    {
      "name": "uuid.png",
      "url": "https://storage.supabase.co/.../overlays/uuid.png"
    }
  ]
}
```

**Notes:**
- Sorted by `created_at` descending (newest first)
- Limited to 100 results
- Filters out `.emptyFolderPlaceholder` entries

---

## Error Format

All API errors follow this shape:

```json
{
  "error": "Human-readable error message",
  "details": "Optional technical details"
}
```

Common HTTP status codes:
- `400` — Bad request / validation failure
- `404` — Resource not found
- `500` — Server error (OpenAI, Supabase, etc.)
