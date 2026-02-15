"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface ManualUploadProps {
  onUpload: (files: File[]) => void;
}

export function ManualUpload({ onUpload }: ManualUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length > 0) onUpload(files);
    },
    [onUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) onUpload(files);
    },
    [onUpload]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground mb-1">
        Manual Upload Fallback
      </p>
      <p className="text-xs text-muted-foreground mb-3">
        Drag & drop carousel images or click to browse
      </p>
      <Button variant="outline" size="sm" asChild>
        <label className="cursor-pointer">
          Browse Files
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </Button>
    </div>
  );
}
