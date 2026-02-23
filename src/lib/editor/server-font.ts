import fs from "fs";
import path from "path";
import opentype from "opentype.js";

const FONT_DIR = path.join(process.cwd(), "public/fonts");

const FONT_FILES: Record<number, string> = {
  400: "TikTokSans-Regular.ttf",
  500: "TikTokSans-Medium.ttf",
  700: "TikTokSans-Bold.ttf",
  800: "TikTokSans-ExtraBold.ttf",
};

// Module-level caches (singleton pattern)
const fontCache = new Map<number, opentype.Font>();
let fontBase64Css: string | null = null;

/**
 * Load a TikTok Sans font file for the given weight using opentype.js.
 * Caches in module scope.
 */
export function loadFont(weight: number): opentype.Font {
  // Map to nearest available weight
  const resolvedWeight = weight >= 800 ? 800 : weight >= 700 ? 700 : weight >= 500 ? 500 : 400;

  const cached = fontCache.get(resolvedWeight);
  if (cached) return cached;

  const filename = FONT_FILES[resolvedWeight];
  const filePath = path.join(FONT_DIR, filename);
  const buffer = fs.readFileSync(filePath);
  const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
  fontCache.set(resolvedWeight, font);
  return font;
}

/**
 * Measure text width using opentype.js font metrics.
 * Accounts for letter-spacing.
 */
export function measureText(
  text: string,
  fontSize: number,
  font: opentype.Font,
  letterSpacing: number = 0
): number {
  const glyphs = font.stringToGlyphs(text);
  let width = 0;
  const scale = fontSize / font.unitsPerEm;

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i];
    width += (glyph.advanceWidth ?? 0) * scale;

    // Apply kerning between consecutive glyphs
    if (i < glyphs.length - 1) {
      const kerning = font.getKerningValue(glyph, glyphs[i + 1]);
      width += kerning * scale;
    }

    // Add letter-spacing for every character except the last
    if (letterSpacing > 0 && i < glyphs.length - 1) {
      width += letterSpacing;
    }
  }

  return width;
}

/**
 * Returns a <style> block with @font-face declarations using base64 data URIs
 * for all TikTok Sans weights. Suitable for embedding in SVG.
 */
export function getFontBase64Css(): string {
  if (fontBase64Css) return fontBase64Css;

  const faces: string[] = [];

  for (const [weight, filename] of Object.entries(FONT_FILES)) {
    const filePath = path.join(FONT_DIR, filename);
    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    faces.push(`@font-face {
  font-family: 'TikTok Sans';
  font-weight: ${weight};
  src: url(data:font/truetype;base64,${base64}) format('truetype');
}`);
  }

  fontBase64Css = `<style>${faces.join("\n")}</style>`;
  return fontBase64Css;
}
