import type { TextBlock } from "./editor";

export interface VideoTextOverlay extends Omit<TextBlock, "paraphrasedText" | "segments"> {
  startTime: number; // seconds
  endTime: number;   // seconds
}

export interface DemoVideo {
  id: string;
  video_url: string;
  thumbnail_url: string | null;
  title: string | null;
  duration: number | null;
  file_size: number | null;
  created_at: string;
}

export interface HookComposition {
  id: string;
  source_video_id: string;
  demo_video_id: string | null;
  rendered_video_url: string | null;
  thumbnail_url: string | null;
  text_overlays: VideoTextOverlay[];
  duration: number | null;
  status: "draft" | "rendering" | "completed" | "failed";
  error_message: string | null;
  review_status: "unverified" | "ready_to_post";
  channel_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface HookCompositionWithRelations extends HookComposition {
  hook_generated_videos: {
    id: string;
    video_url: string | null;
    session_id: string;
  };
  demo_videos: DemoVideo | null;
  project_accounts: {
    id: string;
    username: string;
    nickname: string | null;
    project_id: string;
    projects: { id: string; name: string; color: string | null };
  } | null;
}
