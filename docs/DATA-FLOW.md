# Data Flow Reference

> **Auto-update rule:** When any flow changes (new steps, removed steps, different services), update this file. See `CLAUDE.md` for details.

## 1. TikTok Carousel Fetch

```
User pastes TikTok URL in UrlInput
        │
        ▼
POST /api/tiktok  { url }
        │
        ├─► parseTikTokUrl(url) → extract videoId
        │
        ├─► Check videos.url for dedup
        │       ├─ Found → return { video, isExisting: true }
        │       └─ Not found → continue
        │
        ├─► RapidAPI: GET /api/post/detail?videoId={id}
        │       └─► Extract: description, hashtags, stats, imagePost.images[]
        │
        ├─► For each image URL:
        │       ├─ downloadImage(cdnUrl) → Buffer
        │       └─ uploadToStorage("originals", buffer, "png") → storageUrl
        │
        ├─► INSERT INTO videos (video_id, url, description, ..., original_images)
        │
        └─► Return { video, isExisting: false }
                │
                ▼
Client auto-selects all slides, renders SlideGrid
```

## 2. Image Generation

```
User configures: slides, prompts, quality, format, numSets
        │
        ▼
Click "Generate"
        │
        ▼
POST /api/generate  { videoId, selectedSlides, prompts, quality, numSets }
        │
        ├─► Generate batchId (uuid)
        │
        ├─► For i in 0..numSets:
        │       ├─ INSERT generation_sets (video_id, set_index=i, batch_id, prompts, quality, status="queued")
        │       └─ For each slide in selectedSlides:
        │               └─ INSERT generated_images (set_id, slide_index, per_slide_prompt, overlay_url, status="pending")
        │
        ├─► For each set:
        │       └─ after(): processBatch(set.id, 0) directly; if hasMore, chain to /api/queue
        │           └─ On error: mark set status="failed" to prevent stuck "processing"
        │
        └─► Return { batchId, sets }
                │
                ▼
Client subscribes to Supabase Realtime via useGenerationProgress(batchId)
        │
        ▼
POST /api/queue  { setId, batchStart: 0 }
        │
        ├─► UPDATE generation_sets SET status="processing"
        │
        ├─► SELECT original_images FROM videos WHERE id = set.video_id
        │
        ├─► SELECT 5 generated_images WHERE set_id AND status="pending" OFFSET batchStart
        │
        ├─► For each image (up to 5):
        │       │
        │       ├─ UPDATE status = "generating"
        │       │
        │       ├─ rateLimiter.acquire()  (5 req/min token bucket)
        │       │
        │       ├─ downloadImage(original_images[slide_index]) → originalBuffer
        │       │
        │       ├─ if overlay_url: downloadImage(overlay_url) → overlayBuffer
        │       │
        │       ├─ Determine prompt:
        │       │       per_slide_prompt > first_slide_prompt (if index=0) > other_slides_prompt
        │       │
        │       ├─ generateImage({
        │       │       originalImageBuffer, prompt, overlayImageBuffer?,
        │       │       qualityInput, qualityOutput, outputFormat
        │       │   })
        │       │       │
        │       │       ├─ Convert Buffer → Blob → File
        │       │       ├─ openai.images.edit({ model: "gpt-image-1", image, prompt, size: "1024x1536", quality })
        │       │       └─ Return base64 → Buffer
        │       │
        │       ├─ stripMetadataAndResize({ imageBuffer, outputFormat })
        │       │       ├─ sharp: resize 1080x1350
        │       │       ├─ Remove EXIF, XMP, C2PA, Synth ID
        │       │       └─ Optimize compression per format
        │       │
        │       ├─ uploadToStorage("generated", processedBuffer, format, setId)
        │       │
        │       ├─ UPDATE generated_images SET status="completed", image_url=storageUrl
        │       │
        │       └─ UPDATE generation_sets SET progress_current += 1
        │               │
        │               └─► Supabase Realtime broadcasts change
        │                       │
        │                       └─► Client UI updates progress bar
        │
        ├─► If more images remain:
        │       └─ fetch("/api/queue", { setId, batchStart: batchStart + 5 })  ← self-chain
        │           └─ On chain failure: mark set status="failed"
        │
        ├─► On unrecoverable error (null video_id, missing images):
        │       └─ failSet(): mark pending/generating images as failed, then finalizeSet()
        │
        └─► If done:
                └─ Compute final status:
                        all completed → "completed"
                        some failed   → "partial"
                        all failed    → "failed"
```

## 3. Retry Failed Image

```
User clicks "Retry" on failed image in OutputDisplay
        │
        ▼
POST /api/generate/{imageId}/retry
        │
        ├─► SELECT generated_images WHERE id = imageId
        ├─► SELECT generation_sets WHERE id = image.set_id
        ├─► SELECT videos WHERE id = set.video_id
        │
        ├─► downloadImage(original_images[image.slide_index])
        ├─► if overlay: downloadImage(image.overlay_image_url)
        │
        ├─► Determine prompt (same logic as queue)
        │
        ├─► generateImage({ ... }) → Buffer
        ├─► stripMetadataAndResize({ ... }) → Buffer
        ├─► uploadToStorage("generated", ...) → url
        │
        ├─► UPDATE generated_images SET status="completed", image_url, error_message=null
        │
        └─► Recalculate set status:
                COUNT failed images in set
                all completed → UPDATE status="completed"
                was "partial" and now all done → "completed"
                │
                └─► Supabase Realtime → UI updates
```

## 4. Scheduling

```
User selects channel + datetime in ScheduleControls
        │
        ▼
POST /api/schedule  { setId, channelId, scheduledAt, notes }
        │
        └─► UPDATE generation_sets SET channel_id, scheduled_at, notes
                │
                ▼
Calendar page loads:
        │
        ▼
GET /api/schedule?channelId={filter}&filter={upcoming|posted|all}
        │
        ├─► SELECT generation_sets WHERE scheduled_at IS NOT NULL
        │       JOIN videos (for metadata)
        │       JOIN generated_images (for thumbnails)
        │       + optional filter: upcoming (posted_at IS NULL) or posted (posted_at NOT NULL)
        │
        └─► useScheduledEvents maps to FullCalendar events (green = posted)
                │
                ├─► Calendar view: FullCalendar with custom event icons (✓ posted, ⏰ scheduled)
                └─► List view: ScheduleList with "Done"/"Undo" buttons per row

GET /api/generation-sets?status=completed,partial&scheduled=false&sort=newest&limit=50
        │
        ├─► SELECT generation_sets WHERE status IN ('completed','partial') AND scheduled_at IS NULL
        │       JOIN generated_images
        │       JOIN videos
        │
        └─► useUnscheduledSets → feeds UnscheduledPanel (right sidebar)
                │
                ├─► Drag item onto calendar day
                │       │
                │       ▼
                │   FullCalendar eventReceive → POST /api/schedule
                │       └─► refetch scheduled + unscheduled
                │
                └─► Click "Schedule" button → Popover (datetime + channel)
                        │
                        ▼
                    POST /api/schedule { setId, scheduledAt, channelId }
                        └─► refetch scheduled + unscheduled

User drags existing event to new date/time
        │
        ▼
PUT /api/schedule  { setId, scheduledAt: newDate }
        │
        └─► UPDATE generation_sets SET scheduled_at = newDate
```

## 4a. Mark as Posted

```
User clicks "Mark as Posted" (in ScheduleControls or ScheduleList)
        │
        ▼
PATCH /api/schedule  { setId, posted: true }
        │
        └─► UPDATE generation_sets SET posted_at = now()
                │
                ▼
UI updates: green "Posted" badge, calendar event turns green

User clicks "Undo"
        │
        ▼
PATCH /api/schedule  { setId, posted: false }
        │
        └─► UPDATE generation_sets SET posted_at = null
```

## 4b. Upload Post (Direct Upload)

```
User clicks "Upload Post" in CalendarView header
        │
        ▼
UploadPostDialog opens
        │
        ├─ Drag-drop or browse images
        ├─ Optional: title, channel, schedule date
        │
        ▼
Click "Upload & Schedule"
        │
        ▼
POST /api/upload-post  (FormData: images[], title?, channelId?, scheduledAt?)
        │
        ├─► For each image:
        │       ├─ Buffer.from(file.arrayBuffer())
        │       ├─ stripMetadataAndResize({ imageBuffer, outputFormat: "png" })
        │       └─ uploadToStorage("generated", processed, "png") → generatedUrl
        │
        ├─► INSERT INTO generation_sets (video_id=NULL, title, status="completed", progress_current/total=N, channel_id?, scheduled_at?)
        │
        ├─► INSERT INTO generated_images[] (set_id, slide_index, status="completed", image_url=generatedUrl)
        │
        └─► Return { setId, videoId: null }
                │
                ▼
Dialog closes, calendar refetches → new event appears
```

## 5. ZIP Download

```
User clicks "Download" on completed set in OutputDisplay
        │
        ▼
GET /api/images/{setId}/download
        │
        ├─► SELECT generated_images WHERE set_id AND status="completed"
        │
        ├─► createZipFromUrls([
        │       { url: image.image_url, filename: "slide_1.jpeg" },
        │       { url: image.image_url, filename: "slide_2.jpeg" },
        │       ...
        │   ])
        │       ├─ Download each image via URL
        │       └─ Stream into archiver ZIP
        │
        └─► Return ZIP buffer as Response
                Content-Type: application/zip
                Content-Disposition: attachment; filename="set_0_slides.zip"
```

## 6. Stats Dashboard

```
Dashboard page mounts
        │
        ▼
useDashboardStats() → GET /api/stats
        │
        ├─► COUNT(*) FROM videos
        ├─► COUNT(*) FROM generation_sets (total, completed, failed, scheduled, posted)
        ├─► COUNT(*) FROM generated_images (completed, failed)
        ├─► SELECT last 10 generation_sets
        │       JOIN videos (description)
        │       JOIN generated_images (thumbnail)
        │
        └─► Return enhanced stats + recentSets[]
                │
                ▼
Dashboard renders:
        ├─ 8 stat cards (2x4 grid)
        ├─ Recent Activity (last 10 sets with thumbnails)
        └─ Quick Actions (links to Generate, Calendar, Generated)
```

## 7. Sources (Videos) List

```
Videos page mounts
        │
        ▼
useVideos({ limit: 24 }) → GET /api/videos?page=1&limit=24
        │
        ├─► SELECT videos
        │       JOIN generation_sets(id) for count
        │       + pagination (offset/limit, count: "exact")
        │
        └─► Return { videos, total, page, limit, hasMore }
                │
                ▼
VideoGrid renders:
        ├─ Total count header ("N total videos")
        ├─ Grid of VideoCards (thumbnail + description + stats)
        └─ "Load more (N of T)" button
                │ (click)
                ▼
        Fetches next page, appends to existing list
```

## 9. Hook Creator

```
User navigates to /hooks/new
        │
        ▼
HookWizard mounts → POST /api/hooks/sessions  { source_type: "tiktok"|"upload" }
        │
        └─► INSERT hook_sessions (step=1, status="draft")

--- Step 1: Source ---

User pastes TikTok URL
        │
        ▼
POST /api/hooks/tiktok-video  { url }
        │
        ├─► RapidAPI: GET /api/post/detail?videoId={id}
        ├─► Download video from TikTok CDN
        ├─► Upload to `hook-videos` bucket
        └─► PATCH hook_sessions SET video_url, source_url, step=2

        OR

User uploads video file
        │
        ▼
multipart/form-data → upload to `hook-videos` bucket
        └─► PATCH hook_sessions SET video_url, step=2

--- Step 2: Snapshot ---

User scrubs video to desired frame
        │
        ▼
Click "Use this frame"
        │
        ▼
POST /api/hooks/sessions/[id]/snapshot  { time: 2.5 }
        │
        ├─► Download video from storage
        ├─► ffmpeg: extract frame at time → PNG buffer
        ├─► Upload to `hook-images` bucket
        └─► PATCH hook_sessions SET snapshot_url, snapshot_time, step=3

--- Step 3: Image Prompt ---

User writes image prompt and sets numImages
        │
        ▼
Click "Next"
        │
        ▼
POST /api/hooks/sessions/[id]/generate-images  { prompt, numImages }
        │
        ├─► INSERT hook_generated_images[] (status="pending")
        ├─► PATCH hook_sessions SET image_prompt, status="generating_images", step=4
        │
        ├─► createNanaBananaPrediction({
        │       imageUrl: session.snapshot_url,
        │       prompt,
        │       numImages,
        │       webhookUrl: NEXT_PUBLIC_APP_URL + "/api/hooks/webhook"
        │   })
        │
        └─► UPDATE hook_generated_images SET replicate_id

--- Step 4: Generating Images (polls) ---

HookGeneratingImagesStep polls session every 3s
        │
        ▼
When Replicate completes:
        │
        ▼
POST /api/hooks/webhook  (Replicate → webhook)
        │
        ├─► verifyReplicateWebhook(request, REPLICATE_WEBHOOK_SECRET)
        ├─► Identify record by replicate_id in hook_generated_images
        ├─► Download output images from Replicate CDN
        ├─► Upload to `hook-images` bucket
        ├─► UPDATE hook_generated_images SET status="completed", image_url
        └─► If all completed: PATCH hook_sessions SET status="selecting_images", step=5

--- Step 5: Select Images ---

User selects images to use for video generation
        │
        ▼
Click "Next"
        │
        ▼
PATCH /api/hooks/sessions/[id]/select-images  { selectedImageIds: ["uuid1", "uuid2"] }
        │
        ├─► UPDATE hook_generated_images SET selected=true WHERE id IN selectedImageIds
        └─► PATCH hook_sessions SET step=6

--- Step 6: Video Prompt ---

User writes video prompt, sets duration and aspect ratio
        │
        ▼
Click "Generate Videos"
        │
        ▼
POST /api/hooks/sessions/[id]/generate-videos  { prompt, duration, aspectRatio }
        │
        ├─► SELECT hook_generated_images WHERE session_id AND selected=true
        ├─► INSERT hook_generated_videos[] (one per selected image, status="pending")
        ├─► PATCH hook_sessions SET video_prompt, video_duration, video_aspect_ratio, status="generating_videos", step=7
        │
        ├─► For each selected image:
        │       └─► createKlingPrediction({
        │               imageUrl: image.image_url,
        │               prompt, duration, aspectRatio,
        │               webhookUrl: NEXT_PUBLIC_APP_URL + "/api/hooks/webhook"
        │           })
        │               └─► UPDATE hook_generated_videos SET replicate_id
        │
        └─► Return { videos: [...] }

--- Step 7: Generating Videos (polls) ---

HookGeneratingVideosStep polls session every 5s
        │
        ▼
When Replicate completes:
        │
        ▼
POST /api/hooks/webhook  (Replicate → webhook)
        │
        ├─► Identify record by replicate_id in hook_generated_videos
        ├─► Download output video from Replicate CDN
        ├─► Upload to `hook-videos` bucket
        ├─► Extract thumbnail frame via ffmpeg → upload to `hook-images` bucket
        ├─► UPDATE hook_generated_videos SET status="completed", video_url, thumbnail_url
        └─► If all completed: PATCH hook_sessions SET status="completed"

--- Library ---

User navigates to /hooks
        │
        ▼
useHookLibrary() → GET /api/hooks/library?page=1&limit=20
        │
        ├─► SELECT hook_generated_videos WHERE status="completed"
        │       JOIN hook_sessions (id, title)
        │
        └─► Return { videos, total, page, limit, hasMore }
```

## 8. Generated Carousels

```
Generated page mounts
        │
        ▼
useGeneratedSets({ status, sort, page, limit }) → GET /api/generation-sets
        │
        ├─► SELECT generation_sets with filters
        │       JOIN generated_images
        │       JOIN videos (id, url, description, original_images)
        │       + pagination (offset/limit)
        │
        └─► Return { sets, total, page, limit, hasMore }
                │
                ▼
GeneratedGrid renders:
        ├─ Status filter tabs
        ├─ Sort dropdown
        ├─ Grid of GeneratedSetCards (thumbnail + status + description)
        └─ Pagination (Previous / Next)
```
