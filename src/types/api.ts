export interface TikTokFetchRequest {
  url: string;
}

export interface TikTokFetchResponse {
  video: import("./database").Video;
  isExisting: boolean;
}

export interface GenerateRequest {
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

export interface GenerateResponse {
  batchId: string;
  sets: import("./database").GenerationSet[];
}

export interface RetryRequest {
  imageId: string;
}

export interface ScheduleRequest {
  setId: string;
  channelId: string | null;
  scheduledAt: string | null;
  notes: string | null;
}

export interface AccountStat {
  id: string;
  username: string;
  nickname: string | null;
  totalSets: number;
  completedSets: number;
  scheduledSets: number;
  postedSets: number;
}

export interface StatsResponse {
  totalSets: number;
  completedSets: number;
  pendingSets: number;
  unscheduledSets: number;
  postedSets: number;
  accountStats: AccountStat[];
}

export interface GenerationSetWithVideo {
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
  generated_images: import("./database").GeneratedImage[];
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

export interface GenerationSetsListResponse {
  sets: GenerationSetWithVideo[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface MarkPostedRequest {
  setId: string;
  posted: boolean;
}

export interface QueueProcessRequest {
  setId: string;
  batchStart: number;
}

export interface UploadPostResponse {
  setId: string;
  videoId: string | null;
}

export interface ApiError {
  error: string;
  details?: string;
}
