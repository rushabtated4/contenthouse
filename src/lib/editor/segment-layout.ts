import type { TextSegment } from "@/types/editor";

export interface LayoutWord {
  text: string;
  bold: boolean;
  x: number;
  width: number;
}

export interface LayoutLine {
  words: LayoutWord[];
  width: number;
  y: number;
}

/**
 * Compute layout for text segments with word-wrapping and mixed bold.
 * Returns an array of lines, each containing positioned words.
 */
export function computeSegmentLayout(
  segments: TextSegment[],
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  lineHeight: number,
  letterSpacing: number,
  alignment: "left" | "center" | "right",
  ctx: CanvasRenderingContext2D
): LayoutLine[] {
  const lineHeightPx = fontSize * lineHeight;
  const lines: LayoutLine[] = [];
  let currentLine: LayoutWord[] = [];
  let currentX = 0;

  function setFont(bold: boolean) {
    const weight = bold ? (fontWeight >= 700 ? 800 : 700) : fontWeight;
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    if (letterSpacing) {
      (ctx as unknown as Record<string, unknown>).letterSpacing = `${letterSpacing}px`;
    }
  }

  function measureWord(text: string, bold: boolean): number {
    setFont(bold);
    return ctx.measureText(text).width;
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
    // Split by explicit line breaks first
    const parts = segment.text.split("\n");
    for (let pi = 0; pi < parts.length; pi++) {
      if (pi > 0) {
        // Explicit line break
        pushLine();
      }

      const part = parts[pi];
      if (part.length === 0) continue;

      // Split into words, preserving spaces
      const wordMatches = part.match(/\S+\s*/g) || [];
      for (const wordChunk of wordMatches) {
        const wordWidth = measureWord(wordChunk, segment.bold);

        // Word wrap: if adding this word exceeds maxWidth and we have content on this line
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

  // Flush remaining line
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

/**
 * Convert segments to markdown text with **bold** markers
 */
export function segmentsToMarkdown(segments: TextSegment[]): string {
  return segments
    .map((seg) => (seg.bold ? `**${seg.text}**` : seg.text))
    .join("");
}

/**
 * Parse markdown bold markers back into segments
 */
export function markdownToSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add non-bold text before this match
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    // Add bold text
    segments.push({ text: match[1], bold: true });
    lastIndex = regex.lastIndex;
  }

  // Add remaining non-bold text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  // If no segments parsed, return single non-bold
  if (segments.length === 0) {
    segments.push({ text, bold: false });
  }

  return segments;
}
