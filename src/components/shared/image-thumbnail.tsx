"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface ImageThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  aspectRatio?: string;
}

export function ImageThumbnail({
  src,
  alt,
  className,
  width = 200,
  height = 250,
  aspectRatio = "4/5",
}: ImageThumbnailProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted",
        className
      )}
      style={{ aspectRatio }}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="object-cover w-full h-full"
        unoptimized
      />
    </div>
  );
}
