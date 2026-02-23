"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Text, Rect, Group, Shape, Transformer } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { CANVAS_WIDTH, FONT_FAMILY, BLOCK_PADDING, BLOCK_CORNER_RADIUS, SNAP_THRESHOLD } from "@/lib/editor/defaults";
import { computeSegmentLayout, segmentsToMarkdown, markdownToSegments } from "@/lib/editor/segment-layout";
import type { TextBlock, TextSegment } from "@/types/editor";
import type { LayoutLine } from "@/lib/editor/segment-layout";
import type Konva from "konva";

interface CanvasTextBlockProps {
  block: TextBlock;
  slideIndex: number;
  isSelected: boolean;
  onSelect: (additive: boolean) => void;
  canvasHeight: number;
  onSnapLines: (lines: { x: number[]; y: number[] }) => void;
}

function applyTextTransform(text: string, transform: TextBlock["textTransform"]): string {
  switch (transform) {
    case "uppercase": return text.toUpperCase();
    case "lowercase": return text.toLowerCase();
    default: return text;
  }
}

function getEffectiveSegments(block: TextBlock): TextSegment[] {
  if (block.segments && block.segments.length > 0) {
    return block.segments.map((s) => ({
      text: applyTextTransform(s.text, block.textTransform),
      bold: s.bold,
    }));
  }
  return [{ text: applyTextTransform(block.text, block.textTransform), bold: false }];
}

function hasSegments(block: TextBlock): boolean {
  return !!(block.segments && block.segments.length > 1);
}

export function CanvasTextBlock({ block, slideIndex, isSelected, onSelect, canvasHeight, onSnapLines }: CanvasTextBlockProps) {
  const textRef = useRef<Konva.Text>(null);
  const shapeRef = useRef<Konva.Shape>(null);
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const updateTextBlock = useEditorStore((s) => s.updateTextBlock);
  const moveGroupElements = useEditorStore((s) => s.moveGroupElements);
  const slides = useEditorStore((s) => s.slides);
  const [textHeight, setTextHeight] = useState(block.fontSize * (block.lineHeight ?? 1.2));
  const [layoutLines, setLayoutLines] = useState<LayoutLine[]>([]);

  const padding = block.backgroundPadding ?? BLOCK_PADDING;
  const cornerRadius = block.backgroundCornerRadius ?? BLOCK_CORNER_RADIUS;

  const x = (block.x / 100) * CANVAS_WIDTH;
  const y = (block.y / 100) * canvasHeight;
  const width = (block.width / 100) * CANVAS_WIDTH;

  const fontStyle = String(block.fontWeight);
  const displayText = applyTextTransform(block.text, block.textTransform);
  const useSegments = hasSegments(block);
  const segments = getEffectiveSegments(block);

  // Compute segment layout when needed
  useEffect(() => {
    if (!useSegments) {
      setLayoutLines([]);
      return;
    }

    // Create an offscreen canvas for text measurement
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lines = computeSegmentLayout(
      segments,
      width,
      block.fontSize,
      `${FONT_FAMILY}, sans-serif`,
      block.fontWeight,
      block.lineHeight ?? 1.2,
      block.letterSpacing ?? 0,
      block.alignment,
      ctx
    );

    setLayoutLines(lines);
    const computedHeight = lines.length * block.fontSize * (block.lineHeight ?? 1.2);
    setTextHeight(computedHeight);
  }, [block.text, block.segments, block.fontSize, block.fontWeight, block.lineHeight, block.letterSpacing, block.textTransform, block.alignment, width, useSegments]);

  // Keep textHeight in sync for non-segment rendering
  useEffect(() => {
    if (!useSegments && textRef.current) {
      setTextHeight(textRef.current.height());
    }
  }, [block.text, block.fontSize, block.fontWeight, block.lineHeight, block.letterSpacing, block.textTransform, width, useSegments]);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    node.scaleX(1);
    node.scaleY(1);

    const newWidthPx = (width + padding * 2) * scaleX - padding * 2;
    const newWidthPercent = (newWidthPx / CANVAS_WIDTH) * 100;
    const newXPercent = ((node.x() + padding) / CANVAS_WIDTH) * 100;

    updateTextBlock(slideIndex, block.id, {
      width: Math.max(5, newWidthPercent),
      x: newXPercent,
    });
  }, [slideIndex, block.id, width, padding, updateTextBlock]);

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(e.evt.shiftKey);
    },
    [onSelect]
  );

  const handleDragStart = useCallback(() => {
    dragStartPos.current = { x: block.x, y: block.y };
  }, [block.x, block.y]);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      let gx = node.x();
      let gy = node.y();

      const bgW = width + padding * 2;
      const bgH = textHeight + padding * 2;
      const left = gx;
      const right = gx + bgW;
      const centerX = gx + bgW / 2;
      const top = gy;
      const bottom = gy + bgH;
      const centerY = gy + bgH / 2;

      const snapX: number[] = [];
      const snapY: number[] = [];

      const vGuides = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
      for (const guide of vGuides) {
        if (Math.abs(left - guide) < SNAP_THRESHOLD) {
          gx = guide;
          snapX.push(guide);
        } else if (Math.abs(centerX - guide) < SNAP_THRESHOLD) {
          gx = guide - bgW / 2;
          snapX.push(guide);
        } else if (Math.abs(right - guide) < SNAP_THRESHOLD) {
          gx = guide - bgW;
          snapX.push(guide);
        }
      }

      const hGuides = [0, canvasHeight / 2, canvasHeight];
      for (const guide of hGuides) {
        if (Math.abs(top - guide) < SNAP_THRESHOLD) {
          gy = guide;
          snapY.push(guide);
        } else if (Math.abs(centerY - guide) < SNAP_THRESHOLD) {
          gy = guide - bgH / 2;
          snapY.push(guide);
        } else if (Math.abs(bottom - guide) < SNAP_THRESHOLD) {
          gy = guide - bgH;
          snapY.push(guide);
        }
      }

      node.x(gx);
      node.y(gy);
      onSnapLines({ x: snapX, y: snapY });
    },
    [width, textHeight, padding, canvasHeight, onSnapLines]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const newX = ((node.x() + padding) / CANVAS_WIDTH) * 100;
      const newY = ((node.y() + padding) / canvasHeight) * 100;
      updateTextBlock(slideIndex, block.id, { x: newX, y: newY });

      // Move group siblings by same delta
      if (dragStartPos.current) {
        const deltaX = newX - dragStartPos.current.x;
        const deltaY = newY - dragStartPos.current.y;
        const activeSlide = slides[slideIndex];
        if (activeSlide && (deltaX !== 0 || deltaY !== 0)) {
          const group = activeSlide.groups.find((g) =>
            g.elementRefs.some((r) => r.id === block.id)
          );
          if (group) {
            moveGroupElements(slideIndex, group.id, deltaX, deltaY, block.id);
          }
        }
        dragStartPos.current = null;
      }

      onSnapLines({ x: [], y: [] });
    },
    [slideIndex, block.id, padding, updateTextBlock, canvasHeight, onSnapLines, slides, moveGroupElements]
  );

  const handleDblClick = useCallback(() => {
    const stage = (useSegments ? shapeRef : textRef).current?.getStage();
    if (!stage) return;

    const stageContainer = stage.container();
    const stageBox = stageContainer.getBoundingClientRect();
    const scale = stageBox.width / CANVAS_WIDTH;

    const textarea = document.createElement("textarea");
    stageContainer.parentNode?.appendChild(textarea);

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
        : { r: 0, g: 0, b: 0 };
    };
    const bg = hexToRgb(block.backgroundColor);
    const bgRgba = `rgba(${bg.r},${bg.g},${bg.b},${block.backgroundOpacity})`;
    const scaledRadius = cornerRadius * scale;
    const scaledPadding = padding * scale;

    // Show markdown bold markers for segment-enabled blocks
    const editText = useSegments && block.segments
      ? segmentsToMarkdown(block.segments)
      : block.text;

    textarea.value = editText;
    textarea.style.position = "absolute";
    textarea.style.top = `${stageBox.top + y * scale + window.scrollY}px`;
    textarea.style.left = `${stageBox.left + x * scale + window.scrollX}px`;
    textarea.style.width = `${width * scale}px`;
    textarea.style.minHeight = "40px";
    textarea.style.fontSize = `${block.fontSize * scale}px`;
    textarea.style.fontFamily = `${FONT_FAMILY}, sans-serif`;
    textarea.style.fontWeight = String(block.fontWeight);
    textarea.style.color = block.color;
    textarea.style.textAlign = block.alignment;
    textarea.style.border = "2px solid #E8825F";
    textarea.style.borderRadius = `${scaledRadius}px`;
    textarea.style.padding = `${scaledPadding}px`;
    textarea.style.margin = "0";
    textarea.style.overflow = "hidden";
    textarea.style.background = bgRgba;
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.lineHeight = String(block.lineHeight ?? 1.2);
    textarea.style.letterSpacing = `${(block.letterSpacing ?? 0) * scale}px`;
    textarea.style.textTransform = block.textTransform === "none" ? "none" : block.textTransform;
    textarea.style.zIndex = "1000";
    if (block.hasStroke) {
      textarea.style.webkitTextStroke = `${block.strokeWidth * scale}px ${block.strokeColor}`;
    }

    textarea.focus();

    const finish = () => {
      const val = textarea.value;
      if (useSegments || val.includes("**")) {
        // Parse markdown markers into segments
        const newSegments = markdownToSegments(val);
        const plainText = newSegments.map((s) => s.text).join("");
        const hasMixed = newSegments.some((s) => s.bold) && newSegments.some((s) => !s.bold);
        updateTextBlock(slideIndex, block.id, {
          text: plainText,
          segments: hasMixed ? newSegments : undefined,
        });
      } else {
        updateTextBlock(slideIndex, block.id, { text: val });
      }
      textarea.remove();
    };

    textarea.addEventListener("blur", finish);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        textarea.blur();
      }
      if (e.key === "Escape") {
        textarea.value = editText;
        textarea.blur();
      }
    });
  }, [block, slideIndex, x, y, width, padding, cornerRadius, updateTextBlock, useSegments]);

  const bgWidth = width + padding * 2;
  const bgHeight = textHeight + padding * 2;
  const showBackground = block.backgroundOpacity > 0 || (block.backgroundBorderWidth ?? 0) > 0;

  // Custom sceneFunc for segment rendering
  const segmentSceneFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      const context = ctx._context as CanvasRenderingContext2D;
      const fontFamily = `${FONT_FAMILY}, sans-serif`;
      const baseWeight = block.fontWeight;
      const boldWeight = baseWeight >= 700 ? 800 : 700;

      for (const line of layoutLines) {
        for (const word of line.words) {
          const weight = word.bold ? boldWeight : baseWeight;
          context.font = `${weight} ${block.fontSize}px ${fontFamily}`;
          if (block.letterSpacing) {
            (context as unknown as Record<string, unknown>).letterSpacing = `${block.letterSpacing}px`;
          }

          // Shadow
          if (block.hasShadow) {
            context.shadowColor = block.shadowColor;
            context.shadowBlur = block.shadowBlur;
            context.shadowOffsetX = block.shadowOffsetX;
            context.shadowOffsetY = block.shadowOffsetY;
          }

          // Stroke first (paint-order: stroke)
          if (block.hasStroke) {
            context.strokeStyle = block.strokeColor;
            context.lineWidth = block.strokeWidth;
            context.lineJoin = "round";
            context.lineCap = "round";
            context.strokeText(word.text, word.x, line.y + block.fontSize);
          }

          // Fill
          context.fillStyle = block.color;
          context.fillText(word.text, word.x, line.y + block.fontSize);

          // Reset shadow after each word to avoid compounding
          if (block.hasShadow) {
            context.shadowColor = "transparent";
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
          }
        }
      }

      ctx.fillStrokeShape(shape);
    },
    [layoutLines, block.fontSize, block.fontWeight, block.color, block.letterSpacing, block.hasStroke, block.strokeColor, block.strokeWidth, block.hasShadow, block.shadowColor, block.shadowBlur, block.shadowOffsetX, block.shadowOffsetY]
  );

  const segmentHitFunc = useCallback(
    (ctx: Konva.Context, shape: Konva.Shape) => {
      ctx.beginPath();
      ctx.rect(0, 0, width, textHeight);
      ctx.closePath();
      ctx.fillStrokeShape(shape);
    },
    [width, textHeight]
  );

  return (
    <>
      <Group
        ref={groupRef}
        x={x - padding}
        y={y - padding}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={() => onSelect(false)}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
      >
        {/* Selection indicator */}
        {isSelected && (
          <Rect
            x={-4}
            y={-4}
            width={bgWidth + 8}
            height={bgHeight + 8}
            stroke="#E8825F"
            strokeWidth={2}
            dash={[6, 3]}
            cornerRadius={4}
          />
        )}
        {/* Rounded background pill */}
        {showBackground && (
          <Rect
            x={0}
            y={0}
            width={bgWidth}
            height={bgHeight}
            fill={block.backgroundColor}
            opacity={block.backgroundOpacity}
            cornerRadius={cornerRadius}
            stroke={(block.backgroundBorderWidth ?? 0) > 0 ? (block.backgroundBorderColor ?? "#000000") : undefined}
            strokeWidth={(block.backgroundBorderWidth ?? 0) > 0 ? block.backgroundBorderWidth : 0}
          />
        )}
        {/* Text rendering: Shape for segments, Text for simple blocks */}
        {useSegments ? (
          <Shape
            ref={shapeRef}
            x={padding}
            y={padding}
            width={width}
            height={textHeight}
            sceneFunc={segmentSceneFunc}
            hitFunc={segmentHitFunc}
          />
        ) : (
          <Text
            ref={textRef}
            x={padding}
            y={padding}
            text={displayText}
            width={width}
            fontSize={block.fontSize}
            fontFamily={`${FONT_FAMILY}, sans-serif`}
            fontStyle={fontStyle}
            fill={block.color}
            align={block.alignment}
            lineHeight={block.lineHeight ?? 1.2}
            letterSpacing={block.letterSpacing ?? 0}
            shadowEnabled={block.hasShadow}
            shadowColor={block.shadowColor}
            shadowBlur={block.shadowBlur}
            shadowOffsetX={block.shadowOffsetX}
            shadowOffsetY={block.shadowOffsetY}
            stroke={block.hasStroke ? block.strokeColor : undefined}
            strokeWidth={block.hasStroke ? block.strokeWidth : 0}
            lineJoin={block.hasStroke ? "round" : undefined}
            lineCap={block.hasStroke ? "round" : undefined}
            fillAfterStrokeEnabled={block.hasStroke}
          />
        )}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          enabledAnchors={["middle-left", "middle-right"]}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 50) return oldBox;
            return newBox;
          }}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </>
  );
}
