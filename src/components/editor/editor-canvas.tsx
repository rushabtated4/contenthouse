"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Stage, Layer, Line } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { CanvasBackground } from "./canvas-background";
import { CanvasTextBlock } from "./canvas-text-block";
import { CanvasOverlayImage } from "./canvas-overlay-image";
import { CANVAS_WIDTH, ASPECT_RATIOS } from "@/lib/editor/defaults";
import type { AspectRatio } from "@/lib/editor/defaults";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type Konva from "konva";

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [stageSize, setStageSize] = useState({ width: 540, height: 675 });
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [snapLines, setSnapLines] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

  const slides = useEditorStore((s) => s.slides);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const selectedIds = useEditorStore((s) => s.selectedIds);
  const selectElement = useEditorStore((s) => s.selectElement);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const groupSelected = useEditorStore((s) => s.groupSelected);
  const ungroupSelected = useEditorStore((s) => s.ungroupSelected);
  const aspectRatio = useEditorStore((s) => s.aspectRatio);
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio);

  const activeSlide = slides[activeSlideIndex];
  const canvasHeight = ASPECT_RATIOS[aspectRatio].height;
  const scale = stageSize.width / CANVAS_WIDTH;

  // Load fonts
  useEffect(() => {
    const loadFonts = async () => {
      try {
        await Promise.all([
          new FontFace("TikTok Sans", "url(/fonts/TikTokSans-Regular.ttf)", { weight: "400" }).load(),
          new FontFace("TikTok Sans", "url(/fonts/TikTokSans-Medium.ttf)", { weight: "500" }).load(),
          new FontFace("TikTok Sans", "url(/fonts/TikTokSans-Bold.ttf)", { weight: "700" }).load(),
          new FontFace("TikTok Sans", "url(/fonts/TikTokSans-ExtraBold.ttf)", { weight: "800" }).load(),
        ].map((p) => p.then((f) => document.fonts.add(f))));
        setFontsLoaded(true);
      } catch {
        setFontsLoaded(true);
      }
    };
    loadFonts();
  }, []);

  // Responsive sizing
  useEffect(() => {
    const resize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const width = Math.min(containerWidth, 340);
      const height = (width / CANVAS_WIDTH) * canvasHeight;
      setStageSize({ width, height });
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [canvasHeight]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMeta = e.metaKey || e.ctrlKey;

      // Undo: Cmd+Z
      if (isMeta && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Cmd+Shift+Z
      if (isMeta && e.shiftKey && e.key === "z") {
        e.preventDefault();
        redo();
        return;
      }
      // Group: Cmd+G
      if (isMeta && !e.shiftKey && e.key === "g") {
        e.preventDefault();
        groupSelected(activeSlideIndex);
        return;
      }
      // Ungroup: Cmd+Shift+G
      if (isMeta && e.shiftKey && e.key === "g") {
        e.preventDefault();
        ungroupSelected(activeSlideIndex);
        return;
      }
      // Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.length > 0 && activeSlide) {
          e.preventDefault();
          deleteSelected(activeSlideIndex);
        }
      }
      // Escape to deselect
      if (e.key === "Escape") {
        selectElement(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, activeSlideIndex, activeSlide, deleteSelected, selectElement, undo, redo, groupSelected, ungroupSelected]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Deselect when clicking on stage or background (anything that isn't an interactive element)
      // Interactive elements set cancelBubble = true, so if we reach here the click was on bg/stage
      const clickedOnStage = e.target === e.target.getStage();
      const clickedOnBackground = e.target.getParent() === e.target.getLayer();
      if (clickedOnStage || clickedOnBackground) {
        selectElement(null);
      }
    },
    [selectElement]
  );

  const handleSnapLines = useCallback((lines: { x: number[]; y: number[] }) => {
    setSnapLines(lines);
  }, []);

  // Combine text blocks and overlays, sort by zIndex for rendering
  const sortedElements = useMemo(() => {
    if (!activeSlide) return [];
    const elements: { type: "text" | "overlay"; id: string; zIndex: number }[] = [
      ...activeSlide.textBlocks.map((b) => ({ type: "text" as const, id: b.id, zIndex: b.zIndex ?? 0 })),
      ...activeSlide.overlayImages.map((o) => ({ type: "overlay" as const, id: o.id, zIndex: o.zIndex ?? 0 })),
    ];
    elements.sort((a, b) => a.zIndex - b.zIndex);
    return elements;
  }, [activeSlide]);

  const aspectStr = `${CANVAS_WIDTH}/${canvasHeight}`;

  if (!activeSlide || !fontsLoaded) {
    return (
      <div ref={containerRef} className="w-full flex flex-col items-center gap-3">
        <div
          className="w-full max-w-[340px] bg-muted rounded-lg flex items-center justify-center"
          style={{ aspectRatio: aspectStr }}
        >
          <span className="text-muted-foreground text-sm">
            {!activeSlide ? "No slide selected" : "Loading fonts..."}
          </span>
        </div>
        <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center gap-3">
      <div className="w-full max-w-[340px] mx-auto">
        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          className="rounded-lg overflow-hidden border border-border bg-gray-200"
        >
          <Layer>
            <CanvasBackground
              url={activeSlide.backgroundUrl || activeSlide.originalImageUrl}
              backgroundColor={activeSlide.backgroundColor ?? null}
              canvasHeight={canvasHeight}
            />
            {sortedElements.map((el) => {
              if (el.type === "text") {
                const block = activeSlide.textBlocks.find((b) => b.id === el.id);
                if (!block) return null;
                return (
                  <CanvasTextBlock
                    key={block.id}
                    block={block}
                    slideIndex={activeSlideIndex}
                    isSelected={selectedIds.includes(block.id)}
                    onSelect={(additive) => selectElement(block.id, additive)}
                    canvasHeight={canvasHeight}
                    onSnapLines={handleSnapLines}
                  />
                );
              } else {
                const overlay = activeSlide.overlayImages.find((o) => o.id === el.id);
                if (!overlay) return null;
                return (
                  <CanvasOverlayImage
                    key={overlay.id}
                    overlay={overlay}
                    slideIndex={activeSlideIndex}
                    isSelected={selectedIds.includes(overlay.id)}
                    onSelect={(additive) => selectElement(overlay.id, additive)}
                    canvasHeight={canvasHeight}
                    onSnapLines={handleSnapLines}
                  />
                );
              }
            })}
            {/* Snap guide lines */}
            {snapLines.x.map((xPos, i) => (
              <Line
                key={`snap-x-${i}`}
                points={[xPos, 0, xPos, canvasHeight]}
                stroke="#00BFFF"
                strokeWidth={1.5}
                dash={[8, 4]}
              />
            ))}
            {snapLines.y.map((yPos, i) => (
              <Line
                key={`snap-y-${i}`}
                points={[0, yPos, CANVAS_WIDTH, yPos]}
                stroke="#FF69B4"
                strokeWidth={1.5}
                dash={[8, 4]}
              />
            ))}
          </Layer>
        </Stage>
      </div>
      <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
    </div>
  );
}

function AspectRatioSelector({
  value,
  onChange,
}: {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
}) {
  const ratios: AspectRatio[] = ["4:5", "2:3", "9:16"];
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => {
        if (v) onChange(v as AspectRatio);
      }}
      className="gap-1"
    >
      {ratios.map((r) => (
        <ToggleGroupItem key={r} value={r} size="sm" className="text-xs px-3">
          {r}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
