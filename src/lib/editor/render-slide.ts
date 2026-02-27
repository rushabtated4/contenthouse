import sharp from "sharp";
import { downloadImage } from "@/lib/storage/download";
import { CANVAS_WIDTH, FONT_FAMILY, BLOCK_PADDING, BLOCK_CORNER_RADIUS, ASPECT_RATIOS } from "@/lib/editor/defaults";
import type { AspectRatio } from "@/lib/editor/defaults";
import type { TextBlock, TextSegment, OverlayImage } from "@/types/editor";
import { getFontBase64Css } from "@/lib/editor/server-font";
import { serverComputeSegmentLayout } from "@/lib/editor/server-segment-layout";

export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function applyTextTransform(text: string, transform: TextBlock["textTransform"]): string {
  switch (transform) {
    case "uppercase": return text.toUpperCase();
    case "lowercase": return text.toLowerCase();
    default: return text;
  }
}

/**
 * Build an SVG for a single text block with embedded fonts and word-wrapped text.
 * The SVG is full canvas size so it can be composited at (0,0).
 */
export function buildSingleBlockSvg(block: TextBlock, canvasHeight: number): string {
  const fontCss = getFontBase64Css();

  const x = (block.x / 100) * CANVAS_WIDTH;
  const y = (block.y / 100) * canvasHeight;
  const width = (block.width / 100) * CANVAS_WIDTH;
  const padding = block.backgroundPadding ?? BLOCK_PADDING;
  const cornerRadius = block.backgroundCornerRadius ?? BLOCK_CORNER_RADIUS;
  const lineHeight = block.lineHeight ?? 1.2;
  const letterSpacing = block.letterSpacing ?? 0;
  const lineHeightPx = block.fontSize * lineHeight;

  // Build segments for layout computation
  let segments: TextSegment[];
  if (block.segments && block.segments.length > 0) {
    segments = block.segments.map((s) => ({
      ...s,
      text: applyTextTransform(s.text, block.textTransform),
    }));
  } else {
    segments = [{ text: applyTextTransform(block.text, block.textTransform), bold: false }];
  }

  // Compute word-wrapped layout using server-side opentype.js measurement
  const wordSpacing = block.wordSpacing ?? 0;

  const lines = serverComputeSegmentLayout(
    segments,
    width,
    block.fontSize,
    block.fontWeight,
    lineHeight,
    letterSpacing,
    wordSpacing,
    block.alignment
  );

  const boldWeight = block.fontWeight >= 700 ? 800 : 700;
  const baseWeight = block.fontWeight;

  // Build tspan elements from layout
  const tspanParts: string[] = [];
  for (const line of lines) {
    for (const word of line.words) {
      const weight = word.bold ? boldWeight : baseWeight;
      const wordX = x + word.x;
      const wordY = y + block.fontSize + line.y;
      tspanParts.push(
        `<tspan x="${wordX}" y="${wordY}" font-weight="${weight}">${escapeXml(word.text)}</tspan>`
      );
    }
  }

  const lineCount = lines.length;
  const textTotalHeight = lineCount * lineHeightPx;

  // Shadow filter
  let filterDef = "";
  let filterAttr = "";
  if (block.hasShadow) {
    const filterId = `shadow-${block.id}`;
    const stdDev = block.shadowBlur / 2;
    filterDef = `<filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${block.shadowOffsetX}" dy="${block.shadowOffsetY}" stdDeviation="${stdDev}" flood-color="${escapeXml(block.shadowColor)}" flood-opacity="1" /></filter>`;
    filterAttr = `filter="url(#${filterId})"`;
  }

  // Background rect
  let bgRect = "";
  const showBg = block.backgroundOpacity > 0 || (block.backgroundBorderWidth ?? 0) > 0;
  if (showBg) {
    const rgb = hexToRgb(block.backgroundColor);
    const rectX = x - padding;
    const rectY = y - padding;
    const rectW = width + padding * 2;
    const rectH = textTotalHeight + padding * 2;
    const borderWidth = block.backgroundBorderWidth ?? 0;
    const borderColor = block.backgroundBorderColor ?? "#000000";
    const borderAttr = borderWidth > 0
      ? `stroke="${escapeXml(borderColor)}" stroke-width="${borderWidth}"`
      : "";
    bgRect = `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="${cornerRadius}" ry="${cornerRadius}" fill="rgb(${rgb.r},${rgb.g},${rgb.b})" opacity="${block.backgroundOpacity}" ${borderAttr} />`;
  }

  // Stroke attributes
  let strokeAttr = "";
  if (block.hasStroke) {
    strokeAttr = `stroke="${escapeXml(block.strokeColor)}" stroke-width="${block.strokeWidth}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"`;
  }

  const letterSpacingAttr = letterSpacing > 0 ? `letter-spacing="${letterSpacing}"` : "";
  const wordSpacingAttr = wordSpacing !== 0 ? `word-spacing="${wordSpacing}"` : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${canvasHeight}">
  ${fontCss}
  <g>
    ${filterDef}
    ${bgRect}
    <text
      font-family="'${FONT_FAMILY}', sans-serif"
      font-size="${block.fontSize}"
      font-weight="${block.fontWeight}"
      fill="${escapeXml(block.color)}"
      ${letterSpacingAttr}
      ${wordSpacingAttr}
      ${strokeAttr}
      ${filterAttr}
    >${tspanParts.join("")}</text>
  </g>
</svg>`;
}

/**
 * Process an overlay image: resize, apply corner radius, rotation, opacity.
 * Returns the processed buffer and adjusted position for compositing.
 */
export async function processOverlay(
  overlay: OverlayImage,
  canvasHeight: number
): Promise<{ buffer: Buffer; top: number; left: number } | null> {
  try {
    const overlayBuffer = await downloadImage(overlay.imageUrl);
    const overlayWidth = Math.round((overlay.width / 100) * CANVAS_WIDTH);
    const overlayHeight = Math.round((overlay.height / 100) * canvasHeight);
    let overlayX = Math.round((overlay.x / 100) * CANVAS_WIDTH);
    let overlayY = Math.round((overlay.y / 100) * canvasHeight);

    let processedOverlay: Buffer;

    const cr = overlay.cornerRadius ?? 0;

    let pipeline = sharp(overlayBuffer).resize(overlayWidth, overlayHeight, { fit: "fill" });
    processedOverlay = await pipeline.png().toBuffer();

    if (cr > 0) {
      const maskSvg = `<svg width="${overlayWidth}" height="${overlayHeight}"><rect x="0" y="0" width="${overlayWidth}" height="${overlayHeight}" rx="${cr}" ry="${cr}" fill="white"/></svg>`;
      const maskBuffer = await sharp(Buffer.from(maskSvg)).resize(overlayWidth, overlayHeight).png().toBuffer();
      processedOverlay = await sharp(processedOverlay)
        .ensureAlpha()
        .composite([{ input: maskBuffer, blend: "dest-in" }])
        .png()
        .toBuffer();
    }

    if (overlay.rotation && overlay.rotation !== 0) {
      processedOverlay = await sharp(processedOverlay)
        .rotate(overlay.rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      const angleRad = (Math.abs(overlay.rotation) * Math.PI) / 180;
      const cosA = Math.abs(Math.cos(angleRad));
      const sinA = Math.abs(Math.sin(angleRad));
      const rotatedWidth = overlayWidth * cosA + overlayHeight * sinA;
      const rotatedHeight = overlayWidth * sinA + overlayHeight * cosA;
      const offsetX = (rotatedWidth - overlayWidth) / 2;
      const offsetY = (rotatedHeight - overlayHeight) / 2;
      overlayX = Math.round(overlayX - offsetX);
      overlayY = Math.round(overlayY - offsetY);
    }

    if (overlay.opacity < 1) {
      processedOverlay = await sharp(processedOverlay)
        .ensureAlpha(overlay.opacity)
        .png()
        .toBuffer();
    }

    return {
      buffer: processedOverlay,
      top: Math.max(0, overlayY),
      left: Math.max(0, overlayX),
    };
  } catch (err) {
    console.error(`Failed to process overlay image: ${overlay.imageUrl}`, err);
    return null;
  }
}

interface SlideInput {
  backgroundUrl?: string | null;
  backgroundColor?: string | null;
  backgroundTintColor?: string | null;
  backgroundTintOpacity?: number;
  originalImageUrl?: string;
  textBlocks: TextBlock[];
  overlayImages?: OverlayImage[];
}

/**
 * Render a single editor slide to a Buffer.
 * Encapsulates background, text blocks, and overlays compositing.
 */
export async function renderSlide(
  slide: SlideInput,
  outputFormat: "png" | "jpeg" | "webp",
  aspectRatio: AspectRatio
): Promise<Buffer | null> {
  const canvasHeight = ASPECT_RATIOS[aspectRatio].height;
  const bgColor = slide.backgroundColor;
  const imageUrl = slide.backgroundUrl || slide.originalImageUrl;
  if (!bgColor && !imageUrl) return null;

  let pipeline: sharp.Sharp;
  if (bgColor) {
    const rgb = hexToRgb(bgColor);
    pipeline = sharp({
      create: {
        width: CANVAS_WIDTH,
        height: canvasHeight,
        channels: 3,
        background: { r: rgb.r, g: rgb.g, b: rgb.b },
      },
    }).png();
  } else {
    const bgBuffer = await downloadImage(imageUrl!);
    pipeline = sharp(bgBuffer).resize(CANVAS_WIDTH, canvasHeight, { fit: "cover" });
  }

  // Tint overlay (applied on top of background image, before text/overlays)
  const tintComposites: sharp.OverlayOptions[] = [];
  if (!bgColor && slide.backgroundTintColor && (slide.backgroundTintOpacity ?? 0) > 0) {
    const tint = hexToRgb(slide.backgroundTintColor);
    const tintSvg = `<svg width="${CANVAS_WIDTH}" height="${canvasHeight}"><rect width="100%" height="100%" fill="rgba(${tint.r},${tint.g},${tint.b},${slide.backgroundTintOpacity})" /></svg>`;
    tintComposites.push({ input: Buffer.from(tintSvg), top: 0, left: 0 });
  }

  // Collect all elements and sort by z-order
  const elements: { type: "text" | "overlay"; zIndex: number; data: TextBlock | OverlayImage }[] = [];

  for (const tb of slide.textBlocks) {
    elements.push({ type: "text", zIndex: tb.zIndex ?? 0, data: tb });
  }
  for (const ov of (slide.overlayImages || [])) {
    elements.push({ type: "overlay", zIndex: ov.zIndex ?? 0, data: ov });
  }

  elements.sort((a, b) => a.zIndex - b.zIndex);

  const sharpComposites: sharp.OverlayOptions[] = [];

  for (const elem of elements) {
    if (elem.type === "text") {
      const block = elem.data as TextBlock;
      const svgString = buildSingleBlockSvg(block, canvasHeight);
      sharpComposites.push({ input: Buffer.from(svgString), top: 0, left: 0 });
    } else {
      const overlay = elem.data as OverlayImage;
      const result = await processOverlay(overlay, canvasHeight);
      if (result) {
        sharpComposites.push({
          input: result.buffer,
          top: result.top,
          left: result.left,
        });
      }
    }
  }

  const allComposites = [...tintComposites, ...sharpComposites];
  if (allComposites.length > 0) {
    pipeline = pipeline.composite(allComposites);
  }

  switch (outputFormat) {
    case "jpeg":
      return pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
    case "webp":
      return pipeline.webp({ quality: 95 }).toBuffer();
    default:
      return pipeline.png({ quality: 90 }).toBuffer();
  }
}
