"use client";

import { useEditorStore } from "@/stores/editor-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { segmentsToMarkdown, markdownToSegments } from "@/lib/editor/segment-layout";
import type { TextBlock } from "@/types/editor";

function getDisplayText(block: TextBlock): string {
  if (block.segments && block.segments.length > 1) {
    return segmentsToMarkdown(block.segments);
  }
  return block.text;
}

function hasMixedBold(block: TextBlock): boolean {
  if (!block.segments || block.segments.length <= 1) return false;
  return block.segments.some((s) => s.bold) && block.segments.some((s) => !s.bold);
}

export function ExtractTextModal() {
  const open = useEditorStore((s) => s.extractTextModalOpen);
  const extractedResults = useEditorStore((s) => s.extractedResults);
  const originalSlides = useEditorStore((s) => s.originalSlides);
  const extractionStatus = useEditorStore((s) => s.extractionStatus);
  const closeExtractTextModal = useEditorStore((s) => s.closeExtractTextModal);
  const applyExtractedText = useEditorStore((s) => s.applyExtractedText);
  const updateExtractedBlock = useEditorStore((s) => s.updateExtractedBlock);

  const isLoading = extractionStatus === "loading";

  const handleTextChange = (slideIndex: number, blockIndex: number, block: TextBlock, value: string) => {
    // Parse markdown bold markers back into segments
    if (value.includes("**")) {
      const newSegments = markdownToSegments(value);
      const plainText = newSegments.map((s) => s.text).join("");
      const mixed = newSegments.some((s) => s.bold) && newSegments.some((s) => !s.bold);
      updateExtractedBlock(slideIndex, blockIndex, {
        text: plainText,
        segments: mixed ? newSegments : undefined,
      });
    } else {
      updateExtractedBlock(slideIndex, blockIndex, {
        text: value,
        segments: undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeExtractTextModal()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Extracted Text</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Extracting text from slides...</span>
          </div>
        ) : extractedResults && extractedResults.length > 0 ? (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {extractedResults.map((es) => (
              <div key={es.slideIndex} className="flex gap-4 border rounded-lg p-3">
                {/* Original thumbnail */}
                <div className="shrink-0 w-24">
                  <div className="text-xs text-muted-foreground mb-1">
                    Slide {es.slideIndex + 1}
                  </div>
                  {originalSlides[es.slideIndex] ? (
                    <img
                      src={originalSlides[es.slideIndex]}
                      alt={`Original slide ${es.slideIndex + 1}`}
                      className="w-24 h-30 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-24 h-30 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>

                {/* Text blocks */}
                <div className="flex-1 space-y-3">
                  {es.blocks.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No text detected</p>
                  ) : (
                    es.blocks.map((block, bi) => (
                      <div key={bi} className="space-y-1.5 border-b pb-3 last:border-b-0 last:pb-0">
                        <div className="flex items-start gap-2">
                          <label className="text-xs text-muted-foreground shrink-0 w-16 mt-2">
                            Text
                          </label>
                          <textarea
                            value={getDisplayText(block)}
                            onChange={(e) =>
                              handleTextChange(es.slideIndex, bi, block, e.target.value)
                            }
                            rows={Math.min(4, Math.max(1, block.text.split("\n").length))}
                            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono"
                          />
                        </div>
                        {block.paraphrasedText && (
                          <div className="flex items-start gap-2">
                            <label className="text-xs text-muted-foreground shrink-0 w-16 mt-2">
                              Rewrite
                            </label>
                            <textarea
                              value={block.paraphrasedText}
                              onChange={(e) =>
                                updateExtractedBlock(es.slideIndex, bi, {
                                  paraphrasedText: e.target.value,
                                })
                              }
                              rows={Math.min(4, Math.max(1, (block.paraphrasedText || "").split("\n").length))}
                              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 w-8 p-0 mt-0.5"
                              title="Swap: use rewrite as main text"
                              onClick={() =>
                                updateExtractedBlock(es.slideIndex, bi, {
                                  text: block.paraphrasedText,
                                  paraphrasedText: block.text,
                                })
                              }
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span>Size: {block.fontSize}px</span>
                          <span>Weight: {block.fontWeight}</span>
                          <span className="flex items-center gap-1">
                            Color:
                            <span
                              className="inline-block w-3 h-3 rounded-full border"
                              style={{ backgroundColor: block.color }}
                            />
                            {block.color}
                          </span>
                          {hasMixedBold(block) && (
                            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              Mixed bold
                            </span>
                          )}
                          {block.textTransform && block.textTransform !== "none" && (
                            <span>Transform: {block.textTransform}</span>
                          )}
                          {block.lineHeight && block.lineHeight !== 1.2 && (
                            <span>Line Height: {block.lineHeight.toFixed(1)}</span>
                          )}
                          {(block.letterSpacing ?? 0) > 0 && (
                            <span>Spacing: {block.letterSpacing}px</span>
                          )}
                          {block.hasStroke && (
                            <span>Stroke: {block.strokeWidth}px</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No text was extracted from the slides.
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={closeExtractTextModal}>
            Cancel
          </Button>
          <Button
            onClick={applyExtractedText}
            disabled={isLoading || !extractedResults?.length}
          >
            Add to canvas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
