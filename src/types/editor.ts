export interface TextSegment {
  text: string;
  bold: boolean;
}

export interface TextBlock {
  id: string;
  text: string;
  paraphrasedText?: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  fontSize: number; // px at 1080 canvas width
  fontWeight: 400 | 500 | 600 | 700 | 800;
  zIndex: number;
  color: string; // hex
  alignment: "left" | "center" | "right";
  hasShadow: boolean;
  shadowColor: string; // hex
  shadowBlur: number; // 0-20 px
  shadowOffsetX: number; // px
  shadowOffsetY: number; // px
  backgroundColor: string; // hex
  backgroundOpacity: number; // 0-1
  hasStroke: boolean;
  strokeColor: string; // hex
  strokeWidth: number; // 0-15 px
  textTransform: "none" | "uppercase" | "lowercase";
  lineHeight: number; // multiplier (0.8-3.0), default 1.2
  letterSpacing: number; // px at 1080 canvas, default 0
  wordSpacing: number; // px at 1080 canvas, default 0
  backgroundBorderColor: string; // hex, default "#000000"
  backgroundBorderWidth: number; // 0-8 px, default 0
  backgroundPadding: number; // px, default 20
  backgroundCornerRadius: number; // px, default 16
  segments?: TextSegment[]; // inline bold segments; if undefined, entire text uses block fontWeight
}

export interface OverlayImage {
  id: string;
  imageUrl: string;
  x: number;          // % 0-100
  y: number;          // % 0-100
  width: number;      // % 0-100
  height: number;     // % 0-100
  rotation: number;   // degrees
  opacity: number;    // 0-1
  cornerRadius: number; // px at canvas scale, 0 = sharp corners
  zIndex: number;
}

export type EditorElementType = "textBlock" | "overlay";
export interface EditorElementRef { type: EditorElementType; id: string; }
export interface ElementGroup { id: string; elementRefs: EditorElementRef[]; }

export interface EditorSlide {
  id: string;
  originalImageUrl: string;
  backgroundUrl: string | null;
  backgroundColor: string | null; // hex color, null = use image
  backgroundLibraryId: string | null;
  bgPrompt: string;
  backgroundTintColor: string | null;    // hex color for tint overlay, null = no tint
  backgroundTintOpacity: number;          // 0-1, default 0
  textBlocks: TextBlock[];
  overlayImages: OverlayImage[];
  groups: ElementGroup[];
}

export interface ExtractedSlide {
  slideIndex: number;
  blocks: TextBlock[];
}

export interface BackgroundLibraryItem {
  id: string;
  image_url: string;
  source: "generated" | "uploaded";
  prompt: string | null;
  source_video_id: string | null;
  width: number | null;
  height: number | null;
  folder_id: string | null;
  created_at: string;
}

export interface BackgroundFolder {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  cover_url: string | null;
  image_count: number;
}

export interface EditorStateJson {
  version: 1 | 2;
  aspectRatio: "2:3" | "9:16" | "4:5";
  outputFormat: "png" | "jpeg" | "webp";
  slides: EditorSlide[];
  originalSlides: string[];
}

export interface EditorExportRequest {
  slides: {
    backgroundUrl: string | null;
    backgroundColor: string | null;
    backgroundTintColor?: string | null;
    backgroundTintOpacity?: number;
    originalImageUrl: string;
    textBlocks: TextBlock[];
    overlayImages: OverlayImage[];
  }[];
  outputFormat: "png" | "jpeg" | "webp";
  aspectRatio?: "2:3" | "9:16" | "4:5";
}
