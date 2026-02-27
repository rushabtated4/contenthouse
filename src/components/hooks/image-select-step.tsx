"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SelectableImageCard } from "./selectable-image-card";
import { toast } from "sonner";
import type { HookGeneratedImage } from "@/types/hooks";

interface ImageSelectStepProps {
  sessionId: string;
  images: HookGeneratedImage[];
  onSelectionConfirmed: () => void;
}

export function ImageSelectStep({ sessionId, images, onSelectionConfirmed }: ImageSelectStepProps) {
  const completedImages = images.filter((img) => img.status === "completed" && img.image_url);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(images.filter((img) => img.selected).map((img) => img.id))
  );

  useEffect(() => {
    setSelectedIds(new Set(images.filter((img) => img.selected).map((img) => img.id)));
  }, [images]);

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one image");
      return;
    }

    try {
      // Deselect all first, then select chosen
      const allIds = completedImages.map((img) => img.id);
      await fetch(`/api/hooks/sessions/${sessionId}/select-images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: allIds, selected: false }),
      });

      await fetch(`/api/hooks/sessions/${sessionId}/select-images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: Array.from(selectedIds), selected: true }),
      });

      toast.success(`${selectedIds.size} image${selectedIds.size > 1 ? "s" : ""} selected`);
      onSelectionConfirmed();
    } catch {
      toast.error("Failed to save selection");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 5: Select Images</h2>
        <p className="text-sm text-muted-foreground">
          Choose which images to animate with Kling. At least 1 required.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {completedImages.map((img) => (
          <SelectableImageCard
            key={img.id}
            imageUrl={img.image_url!}
            selected={selectedIds.has(img.id)}
            onToggle={() => handleToggle(img.id)}
          />
        ))}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {selectedIds.size} of {completedImages.length} selected
        </p>
        <Button onClick={handleConfirm} disabled={selectedIds.size === 0}>
          Confirm Selection
        </Button>
      </div>
    </div>
  );
}
