"use client";

import { useEffect, useState, useRef } from "react";
import { Image as KonvaImage, Rect } from "react-konva";
import { CANVAS_WIDTH } from "@/lib/editor/defaults";
import type Konva from "konva";

interface CanvasBackgroundProps {
  url: string;
  backgroundColor: string | null;
  backgroundTintColor: string | null;
  backgroundTintOpacity: number;
  canvasHeight: number;
}

export function CanvasBackground({ url, backgroundColor, backgroundTintColor, backgroundTintOpacity, canvasHeight }: CanvasBackgroundProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const imageRef = useRef<Konva.Image>(null);

  useEffect(() => {
    if (!url || backgroundColor) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = url;
  }, [url, backgroundColor]);

  // Solid color background
  if (backgroundColor) {
    return (
      <Rect
        x={0}
        y={0}
        width={CANVAS_WIDTH}
        height={canvasHeight}
        fill={backgroundColor}
      />
    );
  }

  if (!image) {
    return (
      <Rect
        x={0}
        y={0}
        width={CANVAS_WIDTH}
        height={canvasHeight}
        fill="#E5E7EB"
      />
    );
  }

  // Crop-to-fill: maintain aspect ratio, center-crop to fill canvas
  const imgRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = CANVAS_WIDTH / canvasHeight;

  let cropX = 0, cropY = 0, cropW = image.naturalWidth, cropH = image.naturalHeight;

  if (imgRatio > canvasRatio) {
    // Image is wider than canvas — crop sides
    cropW = image.naturalHeight * canvasRatio;
    cropX = (image.naturalWidth - cropW) / 2;
  } else {
    // Image is taller than canvas — crop top/bottom
    cropH = image.naturalWidth / canvasRatio;
    cropY = (image.naturalHeight - cropH) / 2;
  }

  const showTint = backgroundTintColor && backgroundTintOpacity > 0;

  return (
    <>
      <KonvaImage
        ref={imageRef}
        image={image}
        x={0}
        y={0}
        width={CANVAS_WIDTH}
        height={canvasHeight}
        crop={{ x: cropX, y: cropY, width: cropW, height: cropH }}
      />
      {showTint && (
        <Rect
          x={0}
          y={0}
          width={CANVAS_WIDTH}
          height={canvasHeight}
          fill={backgroundTintColor}
          opacity={backgroundTintOpacity}
        />
      )}
    </>
  );
}
