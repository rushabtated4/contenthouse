import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getOpenAIClient } from "@/lib/openai/client";
import { getRateLimiter } from "@/lib/queue/rate-limiter";
import { CANVAS_WIDTH, ASPECT_RATIOS } from "@/lib/editor/defaults";
import type { AspectRatio } from "@/lib/editor/defaults";
import type { ExtractTextRequest } from "@/types/api";
import type { TextBlock, TextSegment } from "@/types/editor";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body: ExtractTextRequest = await request.json();
    const { videoId, slideIndexes } = body;
    const aspectRatio: AspectRatio = body.aspectRatio || "2:3";
    const canvasHeight = ASPECT_RATIOS[aspectRatio].height;

    if (!videoId || !slideIndexes?.length) {
      return NextResponse.json({ error: "videoId and slideIndexes required" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: video, error: dbError } = await supabase
      .from("videos")
      .select("original_images")
      .eq("id", videoId)
      .single();

    if (dbError || !video?.original_images) {
      return NextResponse.json({ error: "Video not found or no images" }, { status: 404 });
    }

    const openai = getOpenAIClient();
    const rateLimiter = getRateLimiter();

    const validIndexes = slideIndexes.filter((i) => i < video.original_images!.length);

    async function extractSlide(slideIndex: number): Promise<{ slideIndex: number; blocks: TextBlock[] }> {
      await rateLimiter.acquire();
      const imageUrl = video!.original_images![slideIndex];

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5.2",
          messages: [
            {
              role: "system",
              content: `You extract text from TikTok carousel slides. The image is ${CANVAS_WIDTH}px wide × ${canvasHeight}px tall.

Return a JSON object with a "blocks" array. Each block represents one visually distinct text region.

CRITICAL RULES FOR TEXT BLOCKS:
- Create a SEPARATE object in the blocks array for each visually distinct text region (heading, subheading, body paragraph, caption, call-to-action).
- If a title is at the top and body text is in the middle, return 2 separate objects — do NOT merge them.
- Within a single block's "text" field: Do NOT use \\n for word wrapping (the canvas wraps automatically).
- Within a single block's "text" field: Use \\n ONLY for multiple paragraphs within the SAME visual region.

CRITICAL RULES FOR POSITION AND SPACING:
- Positions are percentages (0-100) of the image dimensions, NOT pixels.
- "x" is the percentage from the left edge (0=left, 50=center, 100=right). This is the LEFT edge of the text block.
- "y" is the percentage from the top edge (0=top, 50=middle, 100=bottom). This is the TOP edge of the text block.
- "width" is the percentage of image width the text spans.
- "height" is the percentage of image height the text spans.
- Be precise: look at where the text actually sits relative to the full image.
- SPACING IS CRITICAL: Measure the actual vertical gap between text regions in the image. If there's whitespace between a heading and body text, reflect that gap in the "y" values. Adjacent blocks should NOT touch — ensure (block_N.y + block_N.height + gap) <= block_N+1.y.
- The "height" should account for the actual rendered text height including line wrapping. Overestimate height slightly (add 2-3%) rather than underestimate.

Each block object must have ALL of these fields:
- "text": string, the text content. Only \\n for paragraph breaks (not word wrap).
- "paraphrasedText": string, substantially rewritten with different wording, sentence structure, and vocabulary while preserving the core meaning. Do NOT just swap a few synonyms — restructure the sentence, change the phrasing style, and use a noticeably different voice. Match \\n count.
- "segments": array of {"text": string, "bold": boolean}. Split by bold vs normal. If uniform weight, one segment. Joined segment texts must equal "text".
- "x": number, percentage from left 0-100
- "y": number, percentage from top 0-100
- "width": number, percentage of image width 0-100
- "height": number, percentage of image height 0-100
- "fontSize": number, px at ${CANVAS_WIDTH}px width. Titles 80-120, subtitles 50-70, body 32-48, captions 20-28.
- "fontWeight": number, 400/500/600/700/800
- "color": string, hex
- "alignment": "left" | "center" | "right"
- "textTransform": "uppercase" | "lowercase" | "none"
- "lineHeight": number, 0.8-2.0 (default 1.2)
- "letterSpacing": number, -5 to 30 (default -1.5)
- "wordSpacing": number, -10 to 30 (default 0)
- "hasStroke": boolean (default false)
- "strokeColor": string, hex (default "#000000")
- "strokeWidth": number, 0-15 (default 0)
- "hasShadow": boolean (default false)
- "shadowColor": string, hex (default "#000000")
- "shadowBlur": number, 0-20 (default 4)
- "shadowOffsetX": number, -10 to 10 (default 2)
- "shadowOffsetY": number, -10 to 10 (default 2)
- "backgroundColor": string, hex (default "#000000")
- "backgroundOpacity": number, 0-1 (default 0)
- "backgroundPadding": number, 8-60 (default 20)
- "backgroundCornerRadius": number, 0-50 (default 16)
- "backgroundBorderColor": string, hex (default "#000000")
- "backgroundBorderWidth": number, 0-8 (default 0)

Example with heading + body as separate blocks (note the vertical gap — heading ends at y+height=17%, body starts at y=22%, giving a 5% gap):
{"blocks":[{"text":"Save this for later","paraphrasedText":"Bookmark this for next time","segments":[{"text":"Save this for ","bold":false},{"text":"later","bold":true}],"x":15,"y":5,"width":70,"height":12,"fontSize":96,"fontWeight":700,"color":"#FFFFFF","alignment":"center","textTransform":"none","lineHeight":1.2,"letterSpacing":-1.5,"wordSpacing":0,"hasStroke":false,"strokeColor":"#000000","strokeWidth":0,"hasShadow":false,"shadowColor":"#000000","shadowBlur":4,"shadowOffsetX":2,"shadowOffsetY":2,"backgroundColor":"#000000","backgroundOpacity":0,"backgroundPadding":20,"backgroundCornerRadius":16,"backgroundBorderColor":"#000000","backgroundBorderWidth":0},{"text":"Many managers respond with pressure or punishment when employees underperform.","paraphrasedText":"A lot of leaders resort to force or penalties when their team falls short.","segments":[{"text":"Many managers respond with pressure or punishment when employees underperform.","bold":false}],"x":10,"y":22,"width":80,"height":20,"fontSize":40,"fontWeight":400,"color":"#FFFFFF","alignment":"left","textTransform":"none","lineHeight":1.4,"letterSpacing":-1.5,"wordSpacing":0,"hasStroke":false,"strokeColor":"#000000","strokeWidth":0,"hasShadow":false,"shadowColor":"#000000","shadowBlur":4,"shadowOffsetX":2,"shadowOffsetY":2,"backgroundColor":"#000000","backgroundOpacity":0,"backgroundPadding":20,"backgroundCornerRadius":16,"backgroundBorderColor":"#000000","backgroundBorderWidth":0}]}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageUrl, detail: "high" },
                },
                {
                  type: "text",
                  text: "Extract all text blocks as SEPARATE objects — one per visual region (heading, body, caption). Percentage positions (0-100). No \\n for word wrap.",
                },
              ],
            },
          ],
          temperature: 0,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "text_blocks",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  blocks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        text: { type: "string" },
                        paraphrasedText: { type: "string" },
                        segments: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              text: { type: "string" },
                              bold: { type: "boolean" },
                            },
                            required: ["text", "bold"],
                            additionalProperties: false,
                          },
                        },
                        x: { type: "number" },
                        y: { type: "number" },
                        width: { type: "number" },
                        height: { type: "number" },
                        fontSize: { type: "number" },
                        fontWeight: { type: "number" },
                        color: { type: "string" },
                        alignment: { type: "string", enum: ["left", "center", "right"] },
                        textTransform: { type: "string", enum: ["none", "uppercase", "lowercase"] },
                        lineHeight: { type: "number" },
                        letterSpacing: { type: "number" },
                        wordSpacing: { type: "number" },
                        hasStroke: { type: "boolean" },
                        strokeColor: { type: "string" },
                        strokeWidth: { type: "number" },
                        hasShadow: { type: "boolean" },
                        shadowColor: { type: "string" },
                        shadowBlur: { type: "number" },
                        shadowOffsetX: { type: "number" },
                        shadowOffsetY: { type: "number" },
                        backgroundColor: { type: "string" },
                        backgroundOpacity: { type: "number" },
                        backgroundPadding: { type: "number" },
                        backgroundCornerRadius: { type: "number" },
                        backgroundBorderColor: { type: "string" },
                        backgroundBorderWidth: { type: "number" },
                      },
                      required: [
                        "text", "paraphrasedText", "segments",
                        "x", "y", "width", "height",
                        "fontSize", "fontWeight", "color", "alignment", "textTransform",
                        "lineHeight", "letterSpacing", "wordSpacing",
                        "hasStroke", "strokeColor", "strokeWidth",
                        "hasShadow", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY",
                        "backgroundColor", "backgroundOpacity", "backgroundPadding",
                        "backgroundCornerRadius", "backgroundBorderColor", "backgroundBorderWidth",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["blocks"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content || '{"blocks":[]}';

        let parsed: { blocks: Record<string, unknown>[] };
        try {
          parsed = JSON.parse(content);
        } catch (parseErr) {
          console.error(`[extract-text] JSON parse error for slide ${slideIndex}:`, parseErr, "\nRaw:", content.slice(0, 500));
          return { slideIndex, blocks: [] };
        }

        const VALID_TRANSFORMS = ["none", "uppercase", "lowercase"];

        const blocks: TextBlock[] = (parsed.blocks || []).map(
          (raw: Record<string, unknown>, i: number) => {
            // Positions — clamp to 0-100
            const xPct = Math.min(100, Math.max(0, Number(raw.x) || 10));
            const yPct = Math.min(100, Math.max(0, Number(raw.y) || 10 + i * 15));
            const wPct = Math.min(100, Math.max(1, Number(raw.width) || 80));
            const hPct = Math.min(100, Math.max(1, Number(raw.height) || 10));

            // Font size — clamp, no multiplier
            const fontSize = Math.min(200, Math.max(12, Number(raw.fontSize) || 48));

            // Parse segments
            const rawSegments = raw.segments;
            let segments: TextSegment[] | undefined;
            let segText = "";
            if (Array.isArray(rawSegments) && rawSegments.length > 0) {
              segments = (rawSegments as Record<string, unknown>[]).map((seg) => ({
                text: String(seg.text || ""),
                bold: seg.bold === true,
              }));
              segText = segments.map((s) => s.text).join("");
              // Only keep segments if there's actual mixed bold
              const hasMixed = segments.some((s) => s.bold) && segments.some((s) => !s.bold);
              if (!hasMixed) {
                segments = undefined;
              }
            }

            // Get text — prefer raw.text, fall back to segment concatenation
            const text = segments
              ? segments.map((s) => s.text).join("")
              : raw.text ? String(raw.text) : segText || "";

            return {
              id: crypto.randomUUID(),
              text,
              paraphrasedText: raw.paraphrasedText ? String(raw.paraphrasedText) : undefined,
              segments,
              x: xPct,
              y: yPct,
              width: wPct,
              height: hPct,
              fontSize,
              fontWeight: ([400, 500, 600, 700, 800].includes(Number(raw.fontWeight)) ? Number(raw.fontWeight) : 700) as TextBlock["fontWeight"],
              color: String(raw.color || "#FFFFFF"),
              alignment: (["left", "center", "right"].includes(String(raw.alignment)) ? String(raw.alignment) : "center") as TextBlock["alignment"],
              textTransform: (VALID_TRANSFORMS.includes(String(raw.textTransform)) ? String(raw.textTransform) : "none") as TextBlock["textTransform"],
              lineHeight: Math.min(3.0, Math.max(0.8, Number(raw.lineHeight) || 1.2)),
              letterSpacing: Math.min(30, Math.max(-5, Number(raw.letterSpacing ?? -1.5))),
              wordSpacing: Math.min(30, Math.max(-10, Number(raw.wordSpacing ?? 0))),
              hasShadow: raw.hasShadow === true,
              shadowColor: String(raw.shadowColor || "#000000"),
              shadowBlur: Math.min(20, Math.max(0, Number(raw.shadowBlur) || 4)),
              shadowOffsetX: Math.min(10, Math.max(-10, Number(raw.shadowOffsetX) || 2)),
              shadowOffsetY: Math.min(10, Math.max(-10, Number(raw.shadowOffsetY) || 2)),
              backgroundColor: String(raw.backgroundColor || "#000000"),
              backgroundOpacity: typeof raw.backgroundOpacity === "number" ? Math.min(1, Math.max(0, raw.backgroundOpacity)) : 0,
              backgroundPadding: Math.min(60, Math.max(8, Number(raw.backgroundPadding) || 20)),
              backgroundCornerRadius: Math.min(50, Math.max(0, Number(raw.backgroundCornerRadius) || 16)),
              backgroundBorderColor: String(raw.backgroundBorderColor || "#000000"),
              backgroundBorderWidth: Math.min(8, Math.max(0, Number(raw.backgroundBorderWidth) || 0)),
              hasStroke: raw.hasStroke === true,
              strokeColor: String(raw.strokeColor || "#000000"),
              strokeWidth: Math.min(15, Math.max(0, Number(raw.strokeWidth) || 0)),
              zIndex: i,
            } satisfies TextBlock;
          }
        );

        // Post-processing: enforce minimum vertical gap between blocks
        // Sort by y position, then push blocks down if they overlap
        const MIN_GAP_PCT = 2; // minimum 2% gap between blocks
        const sorted = [...blocks].sort((a, b) => a.y - b.y);
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const prevBottom = prev.y + prev.height;
          const minY = prevBottom + MIN_GAP_PCT;
          if (sorted[i].y < minY) {
            sorted[i].y = Math.min(minY, 95); // don't push off canvas
          }
        }

        return { slideIndex, blocks: sorted };
      } catch (err) {
        console.error(`[extract-text] Failed slide ${slideIndex}:`, err);
        return { slideIndex, blocks: [] };
      }
    }

    const results = await Promise.all(validIndexes.map(extractSlide));

    return NextResponse.json({ slides: results });
  } catch (err) {
    console.error("[extract-text] Error:", err);
    return NextResponse.json(
      { error: "Text extraction failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
