export interface Video {
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

export interface Project {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAccount {
  id: string;
  project_id: string;
  username: string;
  nickname: string | null;
  added_at: string;
  days_of_week: number[] | null;
  posts_per_day: number | null;
}

export interface ProjectAccountWithProject extends ProjectAccount {
  projects: Project;
}

export interface ProjectWithAccounts extends Project {
  project_accounts: ProjectAccount[];
}

export interface App {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface Account {
  id: string;
  username: string;
  nickname: string | null;
  app_id: string;
  sec_uid: string;
  sync_status: string;
  last_video_count: number | null;
  created_at: string;
}

export interface AppWithAccounts extends App {
  accounts: Account[];
}

export interface VideoAccount {
  id: string;
  username: string;
  nickname: string | null;
  app: { id: string; name: string; color: string | null } | null;
}

export interface GenerationSet {
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
  editor_state: import("@/types/editor").EditorStateJson | null;
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

export interface GeneratedImage {
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

export interface GenerationSetWithImages extends GenerationSet {
  generated_images: GeneratedImage[];
}

export interface VideoWithSets extends Video {
  generation_sets: GenerationSetWithImages[];
  generation_count: number;
}
