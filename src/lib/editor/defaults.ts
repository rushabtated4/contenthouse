import type { TextBlock, OverlayImage } from "@/types/editor";

export const DEFAULT_BG_PROMPT =
  "Recreate this image faithfully but remove ALL text overlays, captions, labels, watermarks, and any other text elements. Keep the background, colors, lighting, composition, and all non-text visual elements exactly the same. The result should look identical to the original but with a completely clean, text-free surface.";

export const DEFAULT_TEXT_BLOCK: Omit<TextBlock, "id"> = {
  text: "Your text here",
  x: 10,
  y: 40,
  width: 80,
  height: 20,
  fontSize: 48,
  fontWeight: 700,
  zIndex: 0,
  color: "#FFFFFF",
  alignment: "center",
  hasShadow: false,
  shadowColor: "#000000",
  shadowBlur: 4,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  backgroundColor: "#000000",
  backgroundOpacity: 0,
  hasStroke: false,
  strokeColor: "#000000",
  strokeWidth: 0,
  textTransform: "none",
  lineHeight: 1.2,
  letterSpacing: 0,
  backgroundBorderColor: "#000000",
  backgroundBorderWidth: 0,
  backgroundPadding: 20,
  backgroundCornerRadius: 16,
  segments: undefined,
};

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1350;
export const FONT_FAMILY = "TikTok Sans";

export type AspectRatio = "2:3" | "9:16" | "4:5";

export const ASPECT_RATIOS: Record<AspectRatio, { width: number; height: number; label: string }> = {
  "2:3": { width: 1080, height: 1620, label: "2:3" },
  "9:16": { width: 1080, height: 1920, label: "9:16" },
  "4:5": { width: 1080, height: 1350, label: "4:5" },
};

export const DEFAULT_OVERLAY_IMAGE: Omit<OverlayImage, "id"> = {
  imageUrl: "",
  x: 20,
  y: 20,
  width: 30,
  height: 30,
  rotation: 0,
  opacity: 1,
  cornerRadius: 0,
  zIndex: 100,
};

export const MAX_HISTORY = 50;

export const SNAP_THRESHOLD = 10;

export const BLOCK_PADDING = 20; // px at 1080 canvas scale
export const BLOCK_CORNER_RADIUS = 16; // px at 1080 canvas scale

