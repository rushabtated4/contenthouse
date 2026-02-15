"use client";

import { use, useState } from "react";
import { VideoMetaBar } from "@/components/generate/video-meta-bar";
import { SlideFilmstrip } from "@/components/generate/slide-filmstrip";
import { GlobalControls } from "@/components/generate/global-controls";
import { GenerationProgress } from "@/components/generate/generation-progress";
import { ResultsSection } from "@/components/generate/results-section";
import { GeneratePageSkeleton } from "@/components/shared/loading-skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { useVideo } from "@/hooks/use-video";
import { toast } from "sonner";
import {
  DEFAULT_FIRST_SLIDE_PROMPT,
  DEFAULT_OTHER_SLIDES_PROMPT,
  DEFAULT_INPUT_QUALITY,
  DEFAULT_OUTPUT_QUALITY,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_NUM_SETS,
} from "@/lib/defaults";

export default function GenerateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { video, loading, error, refetch } = useVideo(id);

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
  const [initialized, setInitialized] = useState(false);

  if (video && !initialized) {
    if (video.original_images) {
      setSelectedSlides(new Set(video.original_images.map((_, i) => i)));
    }
    setInitialized(true);
  }

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
      setTimeout(() => refetch(), 2000);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Generation failed";
      setGenerationError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetryImage = async (imageId: string) => {
    try {
      const res = await fetch(`/api/generate/${imageId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Retry failed");
      toast.success("Retrying image...");
      setTimeout(() => refetch(), 3000);
    } catch {
      toast.error("Retry failed");
    }
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
    const url = URL.createObjectURL(file);
    setPerSlideOverlays((prev) => ({ ...prev, [index]: url }));
    toast.success(`Overlay added to slide ${index + 1}`);
  };

  if (loading) {
    return <GeneratePageSkeleton />;
  }

  if (error || !video) {
    return <ErrorState message={error || "Video not found"} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6">
      <VideoMetaBar video={video} />

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
        sets={video.generation_sets || []}
        originalImages={video.original_images || []}
        onRetryImage={handleRetryImage}
      />
    </div>
  );
}
