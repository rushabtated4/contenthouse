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
  days_of_week: number[] | null;
  posts_per_day: number | null;
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

---

## Hook Types — `src/hooks/use-account-overview.ts`

### ScheduledSetSummary

```typescript
interface ScheduledSetSummary {
  id: string;
  channel_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  title: string | null;
  video_id: string | null;
  thumbnail_url: string | null;
}
```

### PostingSlot

```typescript
type PostingSlot = {
  date: Date;
  slotIndex: number;          // 0-based within the day
  set: ScheduledSetSummary | null;
  status: "posted" | "scheduled" | "empty";
};
```

### DayCell

```typescript
interface DayCell {
  date: Date;
  dayOfWeek: number;
  active: boolean;
  slots: PostingSlot[];
}
```

### WeekRow

```typescript
interface WeekRow {
  weekLabel: string;
  days: DayCell[];
}
```

---

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
  editor_state: EditorStateJson | null;
  status: "queued" | "processing" | "completed" | "partial" | "failed" | "editor_draft";
  review_status: "unverified" | "ready_to_post";
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

### App

```typescript
interface App {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}
```

### Account

```typescript
interface Account {
  id: string;
  username: string;
  nickname: string | null;
  app_id: string;
  sec_uid: string;
  sync_status: string;
  last_video_count: number | null;
  created_at: string;
}
```

### AppWithAccounts

```typescript
interface AppWithAccounts extends App {
  accounts: Account[];
}
```

### VideoAccount

```typescript
interface VideoAccount {
  id: string;
  username: string;
  nickname: string | null;
  app: { id: string; name: string; color: string | null } | null;
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

## Editor Types — `src/types/editor.ts`

### TextSegment

```typescript
interface TextSegment {
  text: string;
  bold: boolean; // true = render at bold weight (700, or 800 if block fontWeight >= 700)
}
```

### TextBlock

```typescript
interface TextBlock {
  id: string;
  text: string;
  paraphrasedText?: string; // AI-paraphrased version from extract-text API
  segments?: TextSegment[]; // inline bold segments; if undefined, entire text uses block fontWeight
  x: number;           // percentage 0-100
  y: number;           // percentage 0-100
  width: number;       // percentage 0-100
  height: number;      // percentage 0-100
  fontSize: number;    // px at 1080 canvas width
  fontWeight: 400 | 500 | 600 | 700 | 800;
  zIndex: number;      // layer ordering (higher = in front)
  color: string;       // hex
  alignment: "left" | "center" | "right";
  hasShadow: boolean;
  shadowColor: string; // hex
  shadowBlur: number; // 0-20 px
  shadowOffsetX: number; // px
  shadowOffsetY: number; // px
  backgroundColor: string; // hex (default "#000000")
  backgroundOpacity: number; // 0-1 (default 0)
  backgroundPadding: number; // px (default 20)
  backgroundCornerRadius: number; // px (default 16)
  backgroundBorderColor: string; // hex (default "#000000")
  backgroundBorderWidth: number; // 0-8 px (default 0)
  hasStroke: boolean;        // enable/disable text outline (default false)
  strokeColor: string;       // hex (default "#000000")
  strokeWidth: number;       // 0-10 px (default 0)
  textTransform: "none" | "uppercase" | "lowercase"; // default "none"
  lineHeight: number;        // multiplier 0.8-3.0 (default 1.2)
  letterSpacing: number;     // px at 1080 canvas width (default 0)
  wordSpacing: number;       // px at 1080 canvas width (default 0)
}
```

### OverlayImage

```typescript
interface OverlayImage {
  id: string;
  imageUrl: string;
  x: number;          // % 0-100
  y: number;          // % 0-100
  width: number;      // % 0-100
  height: number;     // % 0-100
  rotation: number;   // degrees
  opacity: number;    // 0-1
  cornerRadius: number;  // px at canvas scale (0 = sharp corners)
  zIndex: number;     // layer ordering
}
```

### EditorElementRef & ElementGroup

```typescript
type EditorElementType = "textBlock" | "overlay";
interface EditorElementRef { type: EditorElementType; id: string; }
interface ElementGroup { id: string; elementRefs: EditorElementRef[]; }
```

### EditorSlide

```typescript
interface EditorSlide {
  id: string;
  originalImageUrl: string;
  backgroundUrl: string | null;
  backgroundLibraryId: string | null;
  bgPrompt: string;
  backgroundTintColor: string | null;    // hex color for tint overlay, null = no tint
  backgroundTintOpacity: number;          // 0-1, default 0
  textBlocks: TextBlock[];
  overlayImages: OverlayImage[];
  groups: ElementGroup[];
}
```

### ExtractedSlide

```typescript
interface ExtractedSlide {
  slideIndex: number;
  blocks: TextBlock[];
}
```

### BackgroundLibraryItem

```typescript
interface BackgroundLibraryItem {
  id: string;
  image_url: string;
  source: "generated" | "uploaded";
  prompt: string | null;
  source_video_id: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}
```

### EditorStateJson

```typescript
interface EditorStateJson {
  version: 1 | 2;  // v2 adds overlayImages, groups, zIndex
  aspectRatio: "2:3" | "9:16" | "4:5";
  outputFormat: "png" | "jpeg" | "webp";
  slides: EditorSlide[];
  originalSlides: string[];
}
```

### EditorExportRequest

```typescript
interface EditorExportRequest {
  slides: {
    backgroundUrl: string | null;
    backgroundColor: string | null;
    backgroundTintColor?: string | null;
    backgroundTintOpacity?: number;
    originalImageUrl: string;
    textBlocks: TextBlock[];
    overlayImages: OverlayImage[];
  }[];
  aspectRatio?: "2:3" | "9:16" | "4:5";
  outputFormat: "png" | "jpeg" | "webp";
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

interface AccountStat {
  id: string;
  username: string;
  nickname: string | null;
  totalSets: number;
  completedSets: number;
  scheduledSets: number;
  postedSets: number;
}

interface StatsResponse {
  totalSets: number;
  completedSets: number;
  pendingSets: number;
  unscheduledSets: number;
  postedSets: number;
  totalVideos: number;
  totalImages: number;
  estimatedCost: number;
  accountStats: AccountStat[];
}

interface GenerationSetWithVideo {
  id: string;
  video_id: string | null;
  title: string | null;
  set_index: number;
  status: string;
  review_status: "unverified" | "ready_to_post";
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
  channel: {
    id: string;
    username: string;
    nickname: string | null;
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

interface RecentSet {
  id: string;
  status: string;
  progress_current: number;
  progress_total: number;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  video_description: string | null;
  thumbnail_url: string | null;
}

interface ExtractTextRequest {
  videoId: string;
  slideIndexes: number[];
  aspectRatio?: "2:3" | "9:16" | "4:5";
}

interface ExtractTextResponse {
  slides: ExtractedSlide[];
}

interface GenerateBackgroundRequest {
  videoId: string;
  slideIndex: number;
  prompt?: string;
}

interface GenerateBackgroundResponse {
  imageUrl: string;
  libraryId: string;
}

interface GenerateBackgroundBatchRequest {
  videoId: string;
  slideIndexes: number[];
  prompt?: string;
}

interface BackgroundsListResponse {
  backgrounds: BackgroundLibraryItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
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

### useApps

```typescript
{
  apps: AppWithAccounts[];
  loading: boolean;
  error: string | null;
}
```

### useVideos

```typescript
// Filter options
interface VideoFilters {
  appId?: string | null;
  accountId?: string | null;
  search?: string;
  minViews?: number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  sort?: string;
  maxGenCount?: number | null;  // exclusive upper bound: 1=Fresh, 2=<2, 5=<5
  minGenCount?: number | null;  // inclusive lower bound: 1=has generations
}

// Return type
{
  videos: VideoWithCount[];  // Video & { generation_count: number; account: VideoAccount | null }
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  loadMore: () => void;
  refetch: () => void;
  resetPages: () => void;
}
```

### useGeneratedSets

```typescript
// Options
interface UseGeneratedSetsOptions {
  status: string;
  reviewStatus?: string;
  sort: string;
  page: number;
  limit: number;
}

// Return
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

---

## Hook Creator Types — `src/types/hooks.ts`

### HookSession

```typescript
interface HookSession {
  id: string;
  title: string | null;
  step: number;
  source_type: "tiktok" | "upload";
  source_url: string | null;
  video_url: string | null;
  snapshot_url: string | null;
  snapshot_time: number;
  image_prompt: string | null;
  video_prompt: string | null;
  video_duration: number | null;
  video_aspect_ratio: string | null;
  status: "draft" | "generating_images" | "selecting_images" | "generating_videos" | "completed";
  created_at: string;
  updated_at: string;
}
```

### HookGeneratedImage

```typescript
interface HookGeneratedImage {
  id: string;
  session_id: string;
  replicate_id: string | null;
  image_url: string | null;
  prompt: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  selected: boolean;
  created_at: string;
}
```

### HookGeneratedVideo

```typescript
interface HookGeneratedVideo {
  id: string;
  session_id: string;
  source_image_id: string | null;
  replicate_id: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  prompt: string | null;
  duration: number | null;
  aspect_ratio: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
}
```

### HookSessionWithMedia

```typescript
interface HookSessionWithMedia extends HookSession {
  hook_generated_images: HookGeneratedImage[];
  hook_generated_videos: HookGeneratedVideo[];
}
```

### HookLibraryVideo

```typescript
interface HookLibraryVideo extends HookGeneratedVideo {
  hook_sessions: { id: string; title: string | null };
}
```

### useHookSession Return Type

```typescript
{
  session: HookSessionWithMedia | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

### useHookLibrary Return Type

```typescript
{
  videos: HookLibraryVideo[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
}
```
