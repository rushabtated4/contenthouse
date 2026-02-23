"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UrlInput } from "@/components/generate/url-input";
import { ManualUpload } from "@/components/generate/manual-upload";
import { VideoMetaBar } from "@/components/generate/video-meta-bar";
import { SlideFilmstrip } from "@/components/generate/slide-filmstrip";
import { GlobalControls } from "@/components/generate/global-controls";
import { GenerationProgress } from "@/components/generate/generation-progress";
import { ResultsSection } from "@/components/generate/results-section";
import { ErrorState } from "@/components/shared/error-state";
import { CarouselEditor } from "@/components/editor/carousel-editor";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Video, GenerationSetWithImages } from "@/types/database";
import {
  DEFAULT_FIRST_SLIDE_PROMPT,
  DEFAULT_OTHER_SLIDES_PROMPT,
  DEFAULT_INPUT_QUALITY,
  DEFAULT_OUTPUT_QUALITY,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_NUM_SETS,
} from "@/lib/defaults";

export default function GeneratePage() {
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(new Set());
  const [perSlidePrompts, setPerSlidePrompts] = useState<Record<number, string>>({});
  const [perSlideOverlays, setPerSlideOverlays] = useState<Record<number, string | null>>({});

  const [firstSlidePrompt, setFirstSlidePrompt] = useState(DEFAULT_FIRST_SLIDE_PROMPT);
  const [otherSlidesPrompt, setOtherSlidesPrompt] = useState(DEFAULT_OTHER_SLIDES_PROMPT);
  const [qualityInput, setQualityInput] = useState<"low" | "high">(DEFAULT_INPUT_QUALITY);
  const [qualityOutput, setQualityOutput] = useState<"low" | "medium" | "high">(DEFAULT_OUTPUT_QUALITY);
  const [numSets, setNumSets] = useState(DEFAULT_NUM_SETS);
  const [outputFormat, setOutputFormat] = useState<"png" | "jpeg" | "webp">(DEFAULT_OUTPUT_FORMAT);

  const [isGenerating, setIsGenerating] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedSets] = useState<GenerationSetWithImages[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleFetch = (data: { video: Record<string, unknown>; isExisting: boolean }) => {
    const v = data.video as unknown as Video;
    setVideo(v);
    setError(null);

    if (data.isExisting) {
      toast.info("This carousel already exists. Loading existing data.");
      router.push(`/generate/${v.id}`);
      return;
    }

    if (v.original_images) {
      setSelectedSlides(new Set(v.original_images.map((_, i) => i)));
    }
  };

  const handleError = (msg: string) => {
    setError(msg);
    setVideo(null);
  };

  const handleManualUpload = async (files: File[]) => {
    toast.info(`Uploading ${files.length} images...`);
    toast.error("Manual upload not yet connected to backend");
  };

  const handleToggleSlide = (index: number) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleOverlayUpload = async (index: number, file: File) => {
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("overlays").upload(path, file, { upsert: false });
    if (error) {
      toast.error("Failed to upload overlay");
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("overlays").getPublicUrl(path);
    setPerSlideOverlays((prev) => ({ ...prev, [index]: publicUrl }));
    toast.success(`Overlay added to slide ${index + 1}`);
  };

  const handleOverlaySelect = (index: number, url: string) => {
    setPerSlideOverlays((prev) => ({ ...prev, [index]: url }));
    toast.success(`Overlay added to slide ${index + 1}`);
  };

  const handleOverlayRemove = (index: number) => {
    setPerSlideOverlays((prev) => ({ ...prev, [index]: null }));
  };

  const handleGenerate = async () => {
    if (!video) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId: video.id,
          selectedSlides: Array.from(selectedSlides),
          firstSlidePrompt,
          otherSlidesPrompt,
          perSlidePrompts,
          perSlideOverlays,
          qualityInput,
          qualityOutput,
          outputFormat,
          numSets,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errMsg = data.error || "Generation failed";
        setGenerationError(errMsg);
        toast.error(errMsg);
        return;
      }

      const data = await res.json();
      setBatchId(data.batchId);
      toast.success("Generation started!");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Generation failed";
      setGenerationError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryImage = async (imageId: string) => {
    setRetryingId(imageId);
    try {
      const res = await fetch(`/api/generate/${imageId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Retry failed");
      toast.success("Retrying image...");
    } catch {
      toast.error("Retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <UrlInput onFetch={handleFetch} onError={handleError} />

      {error && (
        <div className="space-y-4">
          <ErrorState message={error} />
          <ManualUpload onUpload={handleManualUpload} />
        </div>
      )}

      {video && (
        <>
          <VideoMetaBar video={video} />

          <Tabs defaultValue="quick">
            <TabsList>
              <TabsTrigger value="quick">Quick Generate</TabsTrigger>
              <TabsTrigger value="editor">Editor Mode</TabsTrigger>
            </TabsList>

            <TabsContent value="quick" className="space-y-6 mt-4">
              {video.original_images && video.original_images.length > 0 ? (
                <SlideFilmstrip
                  images={video.original_images}
                  selectedSlides={selectedSlides}
                  perSlidePrompts={perSlidePrompts}
                  perSlideOverlays={perSlideOverlays}
                  onToggleSlide={handleToggleSlide}
                  onPromptChange={(i, p) =>
                    setPerSlidePrompts((prev) => ({ ...prev, [i]: p }))
                  }
                  onOverlayUpload={handleOverlayUpload}
                  onOverlaySelect={handleOverlaySelect}
                  onOverlayRemove={handleOverlayRemove}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No original slides</p>
              )}

              <GlobalControls
                firstSlidePrompt={firstSlidePrompt}
                otherSlidesPrompt={otherSlidesPrompt}
                qualityInput={qualityInput}
                qualityOutput={qualityOutput}
                numSets={numSets}
                outputFormat={outputFormat}
                isGenerating={isGenerating}
                canGenerate={selectedSlides.size > 0}
                onFirstPromptChange={setFirstSlidePrompt}
                onOtherPromptChange={setOtherSlidesPrompt}
                onQualityInputChange={setQualityInput}
                onQualityOutputChange={setQualityOutput}
                onNumSetsChange={setNumSets}
                onOutputFormatChange={setOutputFormat}
                onGenerate={handleGenerate}
              />

              <GenerationProgress batchId={batchId} error={generationError} />

              <ResultsSection
                sets={generatedSets}
                originalImages={video.original_images || []}
                onRetryImage={handleRetryImage}
                retryingId={retryingId}
              />
            </TabsContent>

            <TabsContent value="editor" className="mt-4">
              <CarouselEditor video={video} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
