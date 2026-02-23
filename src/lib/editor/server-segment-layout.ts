import type { TextSegment } from "@/types/editor";
import type { LayoutLine, LayoutWord } from "./segment-layout";
import { loadFont, measureText } from "./server-font";

export type { LayoutLine, LayoutWord };

/**
 * Server-side port of computeSegmentLayout.
 * Uses opentype.js for text measurement instead of CanvasRenderingContext2D.
 */
export function serverComputeSegmentLayout(
  segments: TextSegment[],
  maxWidth: number,
  fontSize: number,
  fontWeight: number,
  lineHeight: number,
  letterSpacing: number,
  alignment: "left" | "center" | "right"
): LayoutLine[] {
  const lineHeightPx = fontSize * lineHeight;
  const lines: LayoutLine[] = [];
  let currentLine: LayoutWord[] = [];
  let currentX = 0;

  function getFont(bold: boolean) {
    const weight = bold ? (fontWeight >= 700 ? 800 : 700) : fontWeight;
    return loadFont(weight);
  }

  function measureWord(text: string, bold: boolean): number {
    const font = getFont(bold);
    return measureText(text, fontSize, font, letterSpacing);
  }

  function pushLine() {
    if (currentLine.length === 0) return;
    const lineWidth = currentLine.length > 0
      ? currentLine[currentLine.length - 1].x + currentLine[currentLine.length - 1].width
      : 0;
    lines.push({
      words: currentLine,
      width: lineWidth,
      y: lines.length * lineHeightPx,
    });
    currentLine = [];
    currentX = 0;
  }

  for (const segment of segments) {
    const parts = segment.text.split("\n");
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) {
        pushLine();
      }

      const part = parts[pi];
      if (part.length === 0) continue;

      const wordMatches = part.match(/\S+\s*/g) || [];
      for (const wordChunk of wordMatches) {
        const wordWidth = measureWord(wordChunk, segment.bold);

        if (currentX + wordWidth > maxWidth && currentLine.length > 0) {
          pushLine();
        }

        currentLine.push({
          text: wordChunk,
          bold: segment.bold,
          x: currentX,
          width: wordWidth,
        });
        currentX += wordWidth;
      }
    }
  }

  pushLine();

  // Apply alignment offsets
  if (alignment !== "left") {
    for (const line of lines) {
      const shift = alignment === "center"
        ? (maxWidth - line.width) / 2
        : maxWidth - line.width;
      for (const word of line.words) {
        word.x += shift;
      }
    }
  }

  return lines;
}
