"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Group, Image as KonvaImage, Rect, Transformer } from "react-konva";
import { useEditorStore } from "@/stores/editor-store";
import { CANVAS_WIDTH, SNAP_THRESHOLD } from "@/lib/editor/defaults";
import type { OverlayImage } from "@/types/editor";
import type Konva from "konva";

interface CanvasOverlayImageProps {
  overlay: OverlayImage;
  slideIndex: number;
  isSelected: boolean;
  onSelect: (additive: boolean) => void;
  canvasHeight: number;
  onSnapLines: (lines: { x: number[]; y: number[] }) => void;
}

export function CanvasOverlayImage({
  overlay,
  slideIndex,
  isSelected,
  onSelect,
  canvasHeight,
  onSnapLines,
}: CanvasOverlayImageProps) {
  const groupRef = useRef<Konva.Group>(null);
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const updateOverlayImage = useEditorStore((s) => s.updateOverlayImage);
  const moveGroupElements = useEditorStore((s) => s.moveGroupElements);
  const slides = useEditorStore((s) => s.slides);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const x = (overlay.x / 100) * CANVAS_WIDTH;
  const y = (overlay.y / 100) * canvasHeight;
  const width = (overlay.width / 100) * CANVAS_WIDTH;
  const height = (overlay.height / 100) * canvasHeight;
  const cr = overlay.cornerRadius ?? 0;

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.src = overlay.imageUrl;
  }, [overlay.imageUrl]);

  // Attach transformer
  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Apply corner radius imperatively — Konva Image extends Rect and supports cornerRadius
  useEffect(() => {
    const node = imageRef.current;
    if (!node) return;
    // Konva.Image inherits from Konva.Rect which has cornerRadius
    (node as unknown as Konva.Rect).cornerRadius(cr);
    node.getLayer()?.batchDraw();
  }, [cr]);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      let gx = node.x();
      let gy = node.y();

      const snapX: number[] = [];
      const snapY: number[] = [];

      const vGuides = [0, CANVAS_WIDTH / 2, CANVAS_WIDTH];
      for (const guide of vGuides) {
        if (Math.abs(gx - guide) < SNAP_THRESHOLD) { gx = guide; snapX.push(guide); }
        else if (Math.abs(gx + width / 2 - guide) < SNAP_THRESHOLD) { gx = guide - width / 2; snapX.push(guide); }
        else if (Math.abs(gx + width - guide) < SNAP_THRESHOLD) { gx = guide - width; snapX.push(guide); }
      }

      const hGuides = [0, canvasHeight / 2, canvasHeight];
      for (const guide of hGuides) {
        if (Math.abs(gy - guide) < SNAP_THRESHOLD) { gy = guide; snapY.push(guide); }
        else if (Math.abs(gy + height / 2 - guide) < SNAP_THRESHOLD) { gy = guide - height / 2; snapY.push(guide); }
        else if (Math.abs(gy + height - guide) < SNAP_THRESHOLD) { gy = guide - height; snapY.push(guide); }
      }

      node.x(gx);
      node.y(gy);
      onSnapLines({ x: snapX, y: snapY });
    },
    [width, height, canvasHeight, onSnapLines]
  );

  const handleDragStart = useCallback(() => {
    dragStartPos.current = { x: overlay.x, y: overlay.y };
  }, [overlay.x, overlay.y]);

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const newX = (node.x() / CANVAS_WIDTH) * 100;
      const newY = (node.y() / canvasHeight) * 100;
      updateOverlayImage(slideIndex, overlay.id, { x: newX, y: newY });

      // Move group siblings by same delta
      if (dragStartPos.current) {
        const deltaX = newX - dragStartPos.current.x;
        const deltaY = newY - dragStartPos.current.y;
        const activeSlide = slides[slideIndex];
        if (activeSlide && (deltaX !== 0 || deltaY !== 0)) {
          const group = activeSlide.groups.find((g) =>
            g.elementRefs.some((r) => r.id === overlay.id)
          );
          if (group) {
            moveGroupElements(slideIndex, group.id, deltaX, deltaY, overlay.id);
          }
        }
        dragStartPos.current = null;
      }

      onSnapLines({ x: [], y: [] });
    },
    [slideIndex, overlay.id, updateOverlayImage, canvasHeight, onSnapLines, slides, moveGroupElements]
  );

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = (width * scaleX / CANVAS_WIDTH) * 100;
    const newHeight = (height * scaleY / canvasHeight) * 100;
    const newX = (node.x() / CANVAS_WIDTH) * 100;
    const newY = (node.y() / canvasHeight) * 100;

    updateOverlayImage(slideIndex, overlay.id, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
      rotation,
    });
  }, [slideIndex, overlay.id, width, height, canvasHeight, updateOverlayImage]);

  const handleClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      onSelect(e.evt.shiftKey);
    },
    [onSelect]
  );

  if (!image) return null;

  return (
    <>
      <Group
        ref={groupRef}
        x={x}
        y={y}
        width={width}
        height={height}
        rotation={overlay.rotation}
        draggable
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        onTap={() => onSelect(false)}
      >
        {/* Selection indicator */}
        {isSelected && (
          <Rect
            x={-4}
            y={-4}
            width={width + 8}
            height={height + 8}
            stroke="#3B82F6"
            strokeWidth={2}
            dash={[6, 3]}
            cornerRadius={4}
            listening={false}
          />
        )}
        <Rect
          width={width}
          height={height}
          fillPatternImage={image}
          fillPatternScaleX={width / image.naturalWidth}
          fillPatternScaleY={height / image.naturalHeight}
          cornerRadius={cr}
          opacity={overlay.opacity}
        />
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
              return oldBox;
            }
            return newBox;
          }}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </>
  );
}
