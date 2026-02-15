# TypeScript Types Reference

> **Auto-update rule:** When any type/interface is added, removed, or modified, update this file. See `CLAUDE.md` for details.

---

## Database Types — `src/types/database.ts`

### Video

```typescript
interface Video {
  id: string;
  video_id: string;
  url: string;
  description: string | null;
  hashtags: string[] | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  account_id: string | null;
  posted_at: string | null;
  original_images: string[] | null;
  bucket: string | null;
  first_seen_date: string | null;
  last_updated: string | null;
  viral_since: string | null;
  created_at: string;
}
```

### Project

```typescript
interface Project {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}
```

### ProjectAccount

```typescript
interface ProjectAccount {
  id: string;
  project_id: string;
  username: string;
  nickname: string | null;
  added_at: string;
}
```

### ProjectAccountWithProject

```typescript
interface ProjectAccountWithProject extends ProjectAccount {
  projects: Project;
}
```

### ProjectWithAccounts

```typescript
interface ProjectWithAccounts extends Project {
  project_accounts: ProjectAccount[];
}
```

### GenerationSet

```typescript
interface GenerationSet {
  id: string;
  video_id: string | null;
  title: string | null;
  set_index: number;
  batch_id: string;
  first_slide_prompt: string | null;
  other_slides_prompt: string | null;
  quality_input: string;
  quality_output: string;
  output_format: string;
  selected_slides: number[] | null;
  status: "queued" | "processing" | "completed" | "partial" | "failed";
  progress_current: number;
  progress_total: number;
  channel_id: string | null;
  scheduled_at: string | null;
  notes: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

### GeneratedImage

```typescript
interface GeneratedImage {
  id: string;
  set_id: string;
  slide_index: number;
  image_url: string | null;
  per_slide_prompt: string | null;
  overlay_image_url: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}
```

### Composite Types

```typescript
interface GenerationSetWithImages extends GenerationSet {
  generated_images: GeneratedImage[];
}

interface VideoWithSets extends Video {
  generation_sets: GenerationSetWithImages[];
  generation_count: number;
}
```

---

## API Types — `src/types/api.ts`

### Requests

```typescript
interface TikTokFetchRequest {
  url: string;
}

interface GenerateRequest {
  videoId: string;
  selectedSlides: number[];
  firstSlidePrompt: string;
  otherSlidesPrompt: string;
  perSlidePrompts: Record<number, string>;
  perSlideOverlays: Record<number, string>;
  qualityInput: "low" | "high";
  qualityOutput: "low" | "medium" | "high";
  outputFormat: "png" | "jpeg" | "webp";
  numSets: number;
}

interface RetryRequest {
  imageId: string;
}

interface ScheduleRequest {
  setId: string;
  channelId: string | null;
  scheduledAt: string | null;
  notes: string | null;
}

interface QueueProcessRequest {
  setId: string;
  batchStart: number;
}
```

### Responses

```typescript
interface TikTokFetchResponse {
  video: Video;
  isExisting: boolean;
}

interface GenerateResponse {
  batchId: string;
  sets: GenerationSet[];
}

interface RecentSet {
  id: string;
  status: string;
  created_at: string;
  video_description: string | null;
  thumbnail_url: string | null;
  progress_current: number;
  progress_total: number;
  scheduled_at: string | null;
  posted_at: string | null;
}

interface StatsResponse {
  totalVideos: number;
  totalSets: number;
  totalImages: number;
  estimatedCost: number;
  completedSets: number;
  failedSets: number;
  scheduledSets: number;
  postedSets: number;
  failedImages: number;
  recentSets: RecentSet[];
}

interface GenerationSetWithVideo {
  id: string;
  video_id: string | null;
  title: string | null;
  set_index: number;
  status: string;
  progress_current: number;
  progress_total: number;
  channel_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  updated_at: string;
  generated_images: GeneratedImage[];
  videos: {
    id: string;
    url: string;
    description: string | null;
    original_images: string[] | null;
  } | null;
}

interface GenerationSetsListResponse {
  sets: GenerationSetWithVideo[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

interface MarkPostedRequest {
  setId: string;
  posted: boolean;
}

interface UploadPostResponse {
  setId: string;
  videoId: string | null;
}

interface ApiError {
  error: string;
  details?: string;
}
```

---

## Hook Return Types

### useVideo

```typescript
{
  video: VideoWithSets | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

### useGenerationProgress

```typescript
{
  sets: GenerationSet[];
  images: GeneratedImage[];
  totalImages: number;
  completedImages: number;
  progressPercent: number;
  isComplete: boolean;
}
```

### useProjects

```typescript
{
  projects: ProjectWithAccounts[];
  loading: boolean;
}
```

### useProjectAccounts

```typescript
{
  accounts: ProjectAccountWithProject[];
  loading: boolean;
}
```

### useScheduledEvents

```typescript
interface ScheduledEvent {
  id: string;
  title: string;
  start: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    setId: string;
    videoId: string | null;
    channelId: string | null;
    thumbnail: string | null;
    channelLabel: string | null;
    postedAt: string | null;
  };
}

{
  events: ScheduledEvent[];
  loading: boolean;
  refetch: () => Promise<void>;
}
```

### useDashboardStats

```typescript
{
  stats: StatsResponse | null;
  loading: boolean;
  refetch: () => Promise<void>;
}
```

### useVideos

```typescript
{
  videos: (Video & { generation_count: number })[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
}
```

### useGeneratedSets

```typescript
{
  sets: GenerationSetWithVideo[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  refetch: () => void;
}
```

### useUnscheduledSets

```typescript
{
  sets: GenerationSetWithVideo[];
  total: number;
  loading: boolean;
  refetch: () => void;
}
```
