// Hook Creator types

export interface HookSession {
  id: string;
  source_type: "upload" | "tiktok";
  tiktok_url: string | null;
  tiktok_video_id: string | null;
  video_url: string;
  video_duration: number | null;
  trim_start: number;
  trim_end: number | null;
  snapshot_url: string | null;
  snapshot_timestamp: number | null;
  status: HookSessionStatus;
  created_at: string;
  updated_at: string;
}

export type HookSessionStatus =
  | "draft"
  | "snapshot_ready"
  | "generating_images"
  | "images_ready"
  | "generating_videos"
  | "completed";

export interface HookGeneratedImage {
  id: string;
  session_id: string;
  image_url: string | null;
  prompt: string;
  replicate_prediction_id: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  selected: boolean;
  created_at: string;
}

export interface HookGeneratedVideo {
  id: string;
  session_id: string;
  source_image_id: string;
  video_url: string | null;
  prompt: string | null;
  character_orientation: "image" | "video";
  keep_original_sound: boolean;
  replicate_prediction_id: string | null;
  status: "pending" | "generating" | "completed" | "failed";
  error_message: string | null;
  is_used: boolean;
  channel_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookSessionWithRelations extends HookSession {
  hook_generated_images: HookGeneratedImage[];
  hook_generated_videos: HookGeneratedVideoWithImage[];
}

export interface HookGeneratedVideoWithImage extends HookGeneratedVideo {
  hook_generated_images: HookGeneratedImage;
}

// API request/response types

export interface CreateHookSessionRequest {
  sourceType: "upload" | "tiktok";
  tiktokUrl?: string;
  videoFile?: string; // base64 for upload
}

export interface UpdateHookSessionRequest {
  trimStart?: number;
  trimEnd?: number;
  videoDuration?: number;
}

export interface SnapshotRequest {
  imageData: string; // base64 PNG
  timestamp: number;
}

export interface GenerateImagesRequest {
  prompt: string;
  numImages: number;
  aspectRatio?: string;
}

export interface SelectImagesRequest {
  imageIds: string[];
  selected: boolean;
}

export interface GenerateVideosRequest {
  characterOrientation?: "image" | "video";
  prompt?: string;
  keepOriginalSound?: boolean;
}

export interface HookLibraryFilters {
  status?: string;
  channelId?: string;
  isUsed?: boolean;
  page?: number;
  limit?: number;
}

export interface HookLibraryResponse {
  videos: HookGeneratedVideoWithRelations[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface HookGeneratedVideoWithRelations extends HookGeneratedVideo {
  hook_generated_images: HookGeneratedImage;
  hook_sessions: HookSession;
  project_accounts: {
    id: string;
    username: string;
    nickname: string | null;
    project_id: string;
    projects: { id: string; name: string; color: string | null };
  } | null;
}

export interface UpdateHookVideoRequest {
  isUsed?: boolean;
  channelId?: string | null;
  scheduledAt?: string | null;
  notes?: string | null;
}
