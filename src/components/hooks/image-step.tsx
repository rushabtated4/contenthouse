"use client";

import { useState, useEffect } from "react";
import { ImageGenConfig } from "./image-gen-config";
import { ImageGenResults } from "./image-gen-results";
import { SelectableImageCard } from "./selectable-image-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { HookGeneratedImage } from "@/types/hooks";

interface ImageStepProps {
  sessionId: string;
  existingImages: HookGeneratedImage[];
  onSelectionConfirmed: () => void;
}

interface LibraryImage extends HookGeneratedImage {}

export function ImageStep({ sessionId, existingImages, onSelectionConfirmed }: ImageStepProps) {
  // Generate tab state
  const [prompt, setPrompt] = useState("");
  const [numImages, setNumImages] = useState(4);
  const [aspectRatio, setAspectRatio] = useState("2:3");
  const [model, setModel] = useState("google/nano-banana-pro");
  const [generating, setGenerating] = useState(false);
  const [images, setImages] = useState<HookGeneratedImage[]>(existingImages);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Selection state (for both tabs)
  const completedImages = images.filter((img) => img.status === "completed" && img.image_url);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(images.filter((img) => img.selected).map((img) => img.id))
  );

  // Library tab state
  const [libraryImages, setLibraryImages] = useState<LibraryImage[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());

  // Confirming state
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setImages(existingImages);
    setSelectedIds(new Set(existingImages.filter((img) => img.selected).map((img) => img.id)));
  }, [existingImages]);

  // Generate images
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/generate-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, numImages, aspectRatio, model }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();
      setImages(data.images);
      // Auto-select all newly generated completed images
      const newCompleted = (data.images as HookGeneratedImage[]).filter(
        (img) => img.status === "completed" && img.image_url
      );
      setSelectedIds(new Set(newCompleted.map((img) => img.id)));
      toast.success("Images generated!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRetry = async (imageId: string) => {
    setRetryingId(imageId);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/generate-images/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (!res.ok) throw new Error("Retry failed");
      const updated = await res.json();
      setImages((prev) => prev.map((img) => (img.id === imageId ? updated : img)));
      toast.success("Image regenerated");
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  const handleToggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Confirm selection from Generate tab
  const handleConfirmGenerated = async () => {
    if (selectedIds.size === 0) {
      toast.error("Select at least one image");
      return;
    }
    setConfirming(true);
    try {
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
    } finally {
      setConfirming(false);
    }
  };

  // Library tab
  const fetchLibrary = async () => {
    setLibraryLoading(true);
    try {
      const res = await fetch("/api/hooks/images/library?limit=50");
      if (!res.ok) throw new Error("Failed to load library");
      const data = await res.json();
      setLibraryImages(data.images);
    } catch {
      toast.error("Failed to load image library");
    } finally {
      setLibraryLoading(false);
    }
  };

  const handleLibraryToggle = (id: string) => {
    setSelectedLibraryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleUseLibraryImages = async () => {
    if (selectedLibraryIds.size === 0) {
      toast.error("Select at least one image");
      return;
    }
    setConfirming(true);
    try {
      const res = await fetch(`/api/hooks/sessions/${sessionId}/select-images`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceImageIds: Array.from(selectedLibraryIds) }),
      });
      if (!res.ok) throw new Error("Failed to import images");
      toast.success(`${selectedLibraryIds.size} image${selectedLibraryIds.size > 1 ? "s" : ""} imported`);
      onSelectionConfirmed();
    } catch {
      toast.error("Failed to import images");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Step 4: Images</h2>
        <p className="text-sm text-muted-foreground">
          Generate new images or pick from previously generated ones.
        </p>
      </div>

      <Tabs defaultValue="generate" onValueChange={(v) => v === "library" && libraryImages.length === 0 && fetchLibrary()}>
        <TabsList>
          <TabsTrigger value="generate">Generate</TabsTrigger>
          <TabsTrigger value="library">From Library</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <ImageGenConfig
            prompt={prompt}
            numImages={numImages}
            aspectRatio={aspectRatio}
            model={model}
            generating={generating}
            onPromptChange={setPrompt}
            onNumImagesChange={setNumImages}
            onAspectRatioChange={setAspectRatio}
            onModelChange={setModel}
            onGenerate={handleGenerate}
          />

          <ImageGenResults images={images} onRetry={handleRetry} retryingId={retryingId} />

          {completedImages.length > 0 && (
            <>
              <div>
                <h3 className="text-sm font-medium mb-2">Select images for video generation</h3>
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
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {selectedIds.size} of {completedImages.length} selected
                </p>
                <Button onClick={handleConfirmGenerated} disabled={selectedIds.size === 0 || confirming}>
                  {confirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Confirm Selection
                </Button>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          {libraryLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : libraryImages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No images in library yet. Generate some first!
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {libraryImages.map((img) => (
                  <SelectableImageCard
                    key={img.id}
                    imageUrl={img.image_url!}
                    selected={selectedLibraryIds.has(img.id)}
                    onToggle={() => handleLibraryToggle(img.id)}
                  />
                ))}
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {selectedLibraryIds.size} of {libraryImages.length} selected
                </p>
                <Button onClick={handleUseLibraryImages} disabled={selectedLibraryIds.size === 0 || confirming}>
                  {confirming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
                  Use Selected
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
