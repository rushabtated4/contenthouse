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
8. Rate limit: 50 requests/minute (token bucket)

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
- `review_status` — `unverified`, `ready_to_post`, omitted (no filter)
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

## PATCH /api/generation-sets

Update the review status of a generation set.

**File:** `src/app/api/generation-sets/route.ts`

**Request:**
```json
{
  "setId": "uuid",
  "review_status": "ready_to_post"
}
```

Valid values: `unverified`, `ready_to_post`

**Response (200):** Updated `generation_sets` row.

**Errors:**
- `400` — Missing setId or invalid review_status
- `500` — Database error

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
  "totalVideos": 14706,
  "totalImages": 1200,
  "estimatedCost": 48.00,
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
- `totalVideos` — Total video count in the database
- `totalImages` — Total generated images count
- `estimatedCost` — Estimated cost in USD (totalImages × $0.04)
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

## POST /api/overlays

Upload an overlay image to the `overlays` storage bucket.

**File:** `src/app/api/overlays/route.ts`

**Request:** `multipart/form-data`
- `file` — image file

**Response (200):**
```json
{
  "name": "uuid.png",
  "url": "https://storage.supabase.co/.../overlays/uuid.png"
}
```

---

## POST /api/editor/extract-text

Extract text blocks from carousel slides using GPT-5.2 vision with structured output.

**File:** `src/app/api/editor/extract-text/route.ts`

**Request:**
```json
{
  "videoId": "uuid",
  "slideIndexes": [0, 1, 2],
  "aspectRatio": "4:5"
}
```

`aspectRatio` is optional, defaults to `"4:5"`. Options: `"2:3"` (1080x1620), `"9:16"` (1080x1920), `"4:5"` (1080x1350). Used to compute the correct canvas height for position extraction.

**Implementation notes:**
- Uses `response_format: { type: "json_schema" }` (structured output) — guarantees valid JSON with correct shape, no parse errors.
- GPT-5.2 prompt uses **percentage coordinates** (0-100) for positions. The prompt tells GPT-5.2 the exact canvas dimensions for reference.
- Each visually distinct text region (heading, body, caption) is returned as a **separate block** — no merging.
- Font sizes are passed through directly from the model (no multiplier). Prompt guidelines: titles 80-120, body 32-48, clamped to 12-200.
- `segments` array for mixed-bold detection: `[{ text, bold }]`. Only preserved when actual mixed bold exists.
- `hasShadow` and `hasStroke` default to `false`

**Response (200):**
```json
{
  "slides": [
    {
      "slideIndex": 0,
      "blocks": [
        {
          "id": "uuid",
          "text": "Extracted text",
          "paraphrasedText": "Rephrased version of the text",
          "segments": [{ "text": "Extracted ", "bold": false }, { "text": "text", "bold": true }],
          "x": 10, "y": 40, "width": 80, "height": 20,
          "fontSize": 48, "fontWeight": 700,
          "color": "#FFFFFF", "alignment": "center",
          "hasShadow": false, "shadowColor": "#000000",
          "hasStroke": false, "strokeColor": "#000000", "strokeWidth": 0,
          "textTransform": "uppercase",
          "lineHeight": 1.2,
          "letterSpacing": 0,
          "wordSpacing": 0,
          "backgroundPadding": 20,
          "backgroundCornerRadius": 16,
          "backgroundBorderColor": "#000000",
          "backgroundBorderWidth": 0
        }
      ]
    }
  ]
}
```

**Errors:**
- `400` — Missing videoId or slideIndexes
- `500` — OpenAI vision API failure

---

## POST /api/editor/generate-background

Generate a text-free background for a single slide using OpenAI gpt-image-1.

**File:** `src/app/api/editor/generate-background/route.ts`

**Request:**
```json
{
  "videoId": "uuid",
  "slideIndex": 0,
  "prompt": "optional custom prompt"
}
```

**Response (200):**
```json
{
  "imageUrl": "https://storage.supabase.co/.../backgrounds/uuid.png",
  "libraryId": "uuid",
  "folderId": "uuid"
}
```

**Flow:**
1. Download original slide image from video's `original_images`
2. Call OpenAI images.edit with background removal prompt
3. Strip metadata, resize to 1080x1350
4. Upload to `backgrounds` bucket
5. Create a `background_folders` row named `"Generated - <date> <time>"`
6. Insert into `background_library` table with `folder_id`
7. Return public URL, library ID, and folder ID

**Errors:**
- `400` — Missing videoId or slideIndex
- `500` — OpenAI or storage failure

---

## POST /api/editor/generate-background/batch

Batch generate text-free backgrounds for multiple slides. All slides are processed in parallel via `Promise.all()` (rate limiter still enforces 50 req/min).

**File:** `src/app/api/editor/generate-background/batch/route.ts`
**Max Duration:** 300s (route-level export)

**Request:**
```json
{
  "videoId": "uuid",
  "slideIndexes": [0, 1, 2],
  "prompt": "optional custom prompt"
}
```

**Response (200):**
```json
{
  "backgrounds": [
    { "slideIndex": 0, "imageUrl": "url", "libraryId": "uuid" },
    { "slideIndex": 1, "imageUrl": "url", "libraryId": "uuid" },
    { "slideIndex": 2, "imageUrl": "", "libraryId": null }
  ],
  "folderId": "uuid"
}
```

---

## POST /api/editor/export

Export editor slides as a downloadable ZIP. Composites text blocks onto backgrounds using sharp SVG overlay.

**File:** `src/app/api/editor/export/route.ts`

**Export parity features:**
- Embeds TikTok Sans fonts as base64 `@font-face` in SVG (no server font install needed)
- Server-side word-wrapping via opentype.js matches canvas layout exactly
- Per-element compositing in z-order (text blocks and overlays interleaved correctly)
- Overlay rotation with correct position offset for expanded canvas
- Shadow blur mapped as `stdDeviation = shadowBlur / 2` to match canvas rendering

**Request:**
```json
{
  "slides": [
    {
      "backgroundUrl": "https://storage.url/bg.png",
      "originalImageUrl": "https://storage.url/original.png",
      "textBlocks": [
        {
          "id": "uuid",
          "text": "Hello",
          "x": 10, "y": 40, "width": 80, "height": 20,
          "fontSize": 48, "fontWeight": 700,
          "color": "#FFFFFF", "alignment": "center",
          "hasBorder": false, "borderColor": "#000000", "borderWidth": "medium"
        }
      ]
    }
  ],
  "outputFormat": "png",
  "aspectRatio": "4:5"
}
```

`aspectRatio` is optional, defaults to `"4:5"`. Options: `"2:3"` (1080×1620), `"9:16"` (1080×1920), `"4:5"` (1080×1350).

**Response:** Binary ZIP file
**Content-Type:** `application/zip`

**Errors:**
- `400` — Missing slides array
- `500` — Image processing or ZIP creation failure

---

## POST /api/editor/create-generation

Render all editor slides and insert new `generated_images` rows. Used when an `editor_draft` set has no existing generated images. Also updates the set status from `editor_draft` to `completed`.

**File:** `src/app/api/editor/create-generation/route.ts`

**Request:**
```json
{
  "setId": "uuid",
  "slides": [
    {
      "editorIndex": 0,
      "slide": {
        "backgroundUrl": "https://storage.url/bg.png",
        "backgroundColor": null,
        "backgroundTintColor": null,
        "backgroundTintOpacity": 0,
        "originalImageUrl": "https://storage.url/original.png",
        "textBlocks": [...],
        "overlayImages": [...]
      }
    }
  ],
  "outputFormat": "png",
  "aspectRatio": "2:3"
}
```

**Response:**
```json
{
  "created": [
    { "imageId": "uuid", "imageUrl": "https://storage.url/new.png", "slideIndex": 0 }
  ]
}
```

**Errors:**
- `400` — Missing setId or slides
- `500` — Render or upload failure

`maxDuration = 300`

---

## POST /api/editor/update-generation

Re-render modified editor slides and overwrite their `generated_images` records in the database. Uses the same rendering pipeline as export.

**File:** `src/app/api/editor/update-generation/route.ts`

**Request:**
```json
{
  "setId": "uuid",
  "slides": [
    {
      "editorIndex": 0,
      "slide": {
        "backgroundUrl": "https://storage.url/bg.png",
        "backgroundColor": null,
        "originalImageUrl": "https://storage.url/original.png",
        "textBlocks": [...],
        "overlayImages": [...]
      }
    }
  ],
  "outputFormat": "png",
  "aspectRatio": "2:3"
}
```

**Response:**
```json
{
  "updated": [
    { "imageId": "uuid", "imageUrl": "https://storage.url/new.png", "slideIndex": 0 }
  ]
}
```

**Errors:**
- `400` — Missing setId or slides
- `404` — No completed images found for the set
- `500` — Render or upload failure

`maxDuration = 300`

---

## GET /api/editor/save

Load saved editor state. Supports loading by set ID (any status) or by video ID (editor_draft only).

**File:** `src/app/api/editor/save/route.ts`

**Query Params:**
- `setId` (optional) — Load editor_state from any generation set (any status)
- `videoId` (optional) — Load editor_draft for this video (original behavior)
- At least one of `setId` or `videoId` is required. `setId` takes precedence.

**Response (200):**
```json
{
  "setId": "uuid | null",
  "editorState": "EditorStateJson | null"
}
```

---

## PUT /api/editor/save

Save/upsert editor canvas state as an `editor_draft` generation set.

**File:** `src/app/api/editor/save/route.ts`

**Request:**
```json
{
  "videoId": "uuid",
  "setId": "uuid (optional — update specific row)",
  "editorState": { "version": 1, "aspectRatio": "4:5", "outputFormat": "png", "slides": [], "originalSlides": [] }
}
```

**Response (200):**
```json
{
  "setId": "uuid",
  "isNew": true
}
```

**Errors:**
- `400` — Missing videoId or editorState
- `500` — Database error

---

## GET /api/backgrounds

List saved backgrounds from the background library.

**File:** `src/app/api/backgrounds/route.ts`

**Query Params:**
- `page` — Page number (default: 1)
- `limit` — Results per page (default: 50)
- `folderId` — (optional) Filter by folder: UUID for a specific folder, `"unfiled"` for backgrounds with no folder, omitted for all backgrounds

**Response (200):**
```json
{
  "backgrounds": [
    {
      "id": "uuid",
      "image_url": "https://storage.supabase.co/.../backgrounds/uuid.png",
      "source": "generated",
      "prompt": "Remove all text...",
      "source_video_id": "uuid",
      "folder_id": "uuid | null",
      "width": 1080,
      "height": 1350,
      "created_at": "ISO timestamp"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50,
  "hasMore": false
}
```

## POST /api/backgrounds

Upload a background image to the library.

**File:** `src/app/api/backgrounds/route.ts`

**Request:** `multipart/form-data`
- `file` — Image file (required)
- `folderId` — (optional) UUID of folder to assign the background to

**Response (200):**
```json
{
  "id": "uuid",
  "image_url": "https://storage.supabase.co/.../backgrounds/uuid.png",
  "source": "uploaded",
  "prompt": null,
  "source_video_id": null,
  "folder_id": "uuid | null",
  "width": null,
  "height": null,
  "created_at": "ISO timestamp"
}
```

---

## DELETE /api/backgrounds/[id]

Delete a background from the library and storage.

**File:** `src/app/api/backgrounds/[id]/route.ts`

**Response (200):**
```json
{ "success": true }
```

**Errors:**
- `404` — Background not found
- `500` — Storage or database failure

---

## GET /api/backgrounds/folders

List all background folders with cover image and image count.

**File:** `src/app/api/backgrounds/folders/route.ts`

**Response (200):**
```json
{
  "folders": [
    {
      "id": "uuid",
      "name": "Folder Name",
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp",
      "cover_url": "https://storage.supabase.co/.../backgrounds/uuid.png",
      "image_count": 12
    }
  ]
}
```

## POST /api/backgrounds/folders

Create a new background folder.

**File:** `src/app/api/backgrounds/folders/route.ts`

**Request:**
```json
{ "name": "Folder Name" }
```

**Response (200):**
```json
{ "folder": { "id": "uuid", "name": "Folder Name", "created_at": "ISO timestamp", "updated_at": "ISO timestamp" } }
```

**Errors:**
- `400` — Missing name
- `500` — Database error

---

## PATCH /api/backgrounds/folders/[id]

Rename a background folder.

**File:** `src/app/api/backgrounds/folders/[id]/route.ts`

**Request:**
```json
{ "name": "New Name" }
```

**Response (200):**
```json
{ "folder": { "id": "uuid", "name": "New Name", "created_at": "ISO timestamp", "updated_at": "ISO timestamp" } }
```

**Errors:**
- `400` — Missing name
- `500` — Database error

## DELETE /api/backgrounds/folders/[id]

Delete a background folder.

**File:** `src/app/api/backgrounds/folders/[id]/route.ts`

**Query Params:**
- `deleteImages` — `true` to also delete all images in the folder; `false` (default) to unfile them (set `folder_id` to null)

**Response (200):**
```json
{ "success": true }
```

**Errors:**
- `500` — Database or storage error

---

## POST /api/backgrounds/upload-batch

Upload multiple background images to a folder at once.

**File:** `src/app/api/backgrounds/upload-batch/route.ts`
**Max Duration:** 300s (route-level export)

**Request:** `multipart/form-data`
- `files` — One or more image files (required)
- `folderId` — (optional) UUID of folder to assign backgrounds to

**Response (200):**
```json
{
  "uploaded": [
    { "id": "uuid", "image_url": "https://storage.supabase.co/.../backgrounds/uuid.png" }
  ]
}
```

**Errors:**
- `400` — No files provided
- `500` — Storage or database failure

---

---

## Hook Creator API

### GET /api/hooks/sessions

List all hook creator sessions.

**File:** `src/app/api/hooks/sessions/route.ts`

**Response (200):**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "string | null",
      "step": 1,
      "source_type": "tiktok | upload",
      "source_url": "string | null",
      "video_url": "string | null",
      "snapshot_url": "string | null",
      "snapshot_time": 0.0,
      "status": "draft | generating_images | selecting_images | generating_videos | completed",
      "created_at": "ISO timestamp",
      "updated_at": "ISO timestamp"
    }
  ]
}
```

---

### POST /api/hooks/sessions

Create a new hook creator session.

**File:** `src/app/api/hooks/sessions/route.ts`

**Request:**
```json
{
  "title": "optional string",
  "source_type": "tiktok | upload",
  "source_url": "https://www.tiktok.com/...",
  "video_url": "string (storage URL if uploaded)"
}
```

**Response (200):**
```json
{ "session": { ...HookSession } }
```

---

### GET /api/hooks/sessions/[id]

Fetch a single hook session with its generated images and videos.

**File:** `src/app/api/hooks/sessions/[id]/route.ts`

**Response (200):**
```json
{
  "session": {
    "id": "uuid",
    "hook_generated_images": [...],
    "hook_generated_videos": [...]
  }
}
```

**Errors:**
- `404` — Session not found

---

### PATCH /api/hooks/sessions/[id]

Update hook session fields (title, step, config, etc.).

**File:** `src/app/api/hooks/sessions/[id]/route.ts`

**Request:** Partial `HookSession` fields to update.

**Response (200):** `{ "session": { ...HookSession } }`

---

### DELETE /api/hooks/sessions/[id]

Delete a hook session and its generated images/videos.

**File:** `src/app/api/hooks/sessions/[id]/route.ts`

**Response (200):** `{ "success": true }`

---

### POST /api/hooks/sessions/[id]/snapshot

Extract a snapshot frame from the session's video at a given timestamp.

**File:** `src/app/api/hooks/sessions/[id]/snapshot/route.ts`

**Request:**
```json
{ "time": 2.5 }
```

**Response (200):**
```json
{ "snapshotUrl": "https://storage.supabase.co/.../hook-images/uuid.png" }
```

**Flow:**
1. Download session video from storage
2. Use ffmpeg to extract frame at `time` seconds
3. Upload to `hook-images` bucket
4. Update `hook_sessions.snapshot_url` and `snapshot_time`

---

### POST /api/hooks/sessions/[id]/generate-images

Generate hook images from the session's snapshot via Replicate Nano Banana Pro.

**File:** `src/app/api/hooks/sessions/[id]/generate-images/route.ts`

**Request:**
```json
{
  "prompt": "A dynamic hook image...",
  "numImages": 4
}
```

**Response (200):**
```json
{ "images": [{ "id": "uuid", "status": "pending" }] }
```

**Flow:**
1. Create `hook_generated_images` records with status `pending`
2. Submit prediction to Replicate Nano Banana Pro
3. Webhook at `POST /api/hooks/webhook` receives completion
4. Update session step to `selecting_images`

---

### POST /api/hooks/sessions/[id]/generate-images/retry

Retry a failed hook image generation.

**File:** `src/app/api/hooks/sessions/[id]/generate-images/retry/route.ts`

**Request:**
```json
{ "imageId": "uuid" }
```

**Response (200):** `{ "success": true }`

---

### PATCH /api/hooks/sessions/[id]/select-images

Mark which generated images are selected for video generation and advance the wizard step.

**File:** `src/app/api/hooks/sessions/[id]/select-images/route.ts`

**Request:**
```json
{ "selectedImageIds": ["uuid1", "uuid2"] }
```

**Response (200):** `{ "success": true }`

---

### POST /api/hooks/sessions/[id]/generate-videos

Generate hook videos from selected images via Replicate Kling v2.6.

**File:** `src/app/api/hooks/sessions/[id]/generate-videos/route.ts`

**Request:**
```json
{
  "prompt": "A smooth cinematic motion...",
  "duration": 5,
  "aspectRatio": "9:16"
}
```

**Response (200):**
```json
{ "videos": [{ "id": "uuid", "status": "pending" }] }
```

**Flow:**
1. Create `hook_generated_videos` records for each selected image
2. Submit prediction to Replicate Kling v2.6 per image
3. Webhook at `POST /api/hooks/webhook` receives completion
4. Update session step to `completed` when all done

---

### POST /api/hooks/tiktok-video

Download a TikTok video and store it in the `hook-videos` bucket for use as hook input.

**File:** `src/app/api/hooks/tiktok-video/route.ts`

**Request:**
```json
{ "url": "https://www.tiktok.com/@user/video/123456" }
```

**Response (200):**
```json
{ "videoUrl": "https://storage.supabase.co/.../hook-videos/uuid.mp4" }
```

---

### POST /api/hooks/webhook

Replicate webhook receiver. Updates `hook_generated_images` or `hook_generated_videos` status when a prediction completes or fails.

**File:** `src/app/api/hooks/webhook/route.ts`

**Request:** Replicate webhook payload (HMAC-SHA256 verified via `REPLICATE_WEBHOOK_SECRET`).

**Response (200):** `{ "received": true }`

**Flow:**
1. Verify `replicate-webhook-id` + `replicate-webhook-signature` headers
2. Identify record type from prediction metadata
3. Download output from Replicate CDN and upload to Supabase storage
4. Update record status (`completed` or `failed`) and output URL
5. Recalculate parent session status

---

### GET /api/hooks/library

List all completed hook videos across all sessions.

**File:** `src/app/api/hooks/library/route.ts`

**Query Params:**
- `page` — Page number (default: 1)
- `limit` — Results per page (default: 20)

**Response (200):**
```json
{
  "videos": [
    {
      "id": "uuid",
      "session_id": "uuid",
      "video_url": "string",
      "thumbnail_url": "string | null",
      "prompt": "string | null",
      "duration": 5,
      "status": "completed",
      "created_at": "ISO timestamp",
      "hook_sessions": { "id": "uuid", "title": "string | null" }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "hasMore": true
}
```

---

### PATCH /api/hooks/videos/[id]

Update a hook video record (e.g., title or notes).

**File:** `src/app/api/hooks/videos/[id]/route.ts`

**Request:** Partial `HookGeneratedVideo` fields.

**Response (200):** `{ "video": { ...HookGeneratedVideo } }`

---

### DELETE /api/hooks/videos/[id]

Delete a hook video record and its storage file.

**File:** `src/app/api/hooks/videos/[id]/route.ts`

**Response (200):** `{ "success": true }`

---

### GET /api/hooks/videos/[id]/download

Download a completed hook video file.

**File:** `src/app/api/hooks/videos/[id]/download/route.ts`

**Response:** Binary video file (MP4)
**Content-Type:** `video/mp4`

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
