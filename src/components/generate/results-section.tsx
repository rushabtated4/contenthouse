"use client";

import { downloadSetAsZip } from "@/lib/client/download-zip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageThumbnail } from "@/components/shared/image-thumbnail";
import { ScheduleControls } from "./schedule-controls";
import {
  RefreshCw,
  AlertCircle,
  ImageOff,
} from "lucide-react";
import type { GenerationSetWithImages } from "@/types/database";

interface ResultsSectionProps {
  sets: GenerationSetWithImages[];
  originalImages: string[];
  onRetryImage: (imageId: string) => void;
  retryingId: string | null;
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case "completed":
      return "default" as const;
    case "partial":
      return "secondary" as const;
    case "failed":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function ResultsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 rounded-xl border-2 border-dashed border-border">
      <ImageOff className="w-10 h-10" />
      <p className="text-sm">Generated variations will appear here</p>
    </div>
  );
}

function ComparisonCard({
  slideIndex,
  originalUrl,
  image,
  onRetryImage,
  retryingId,
}: {
  slideIndex: number;
  originalUrl: string | undefined;
  image: {
    id: string;
    status: string;
    image_url: string | null;
    error_message: string | null;
  };
  onRetryImage: (imageId: string) => void;
  retryingId: string | null;
}) {
  const isRetrying = retryingId === image.id;
  return (
    <div className="rounded-xl border border-border bg-card p-2 space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        {/* Original (faded) */}
        <div className="relative">
          {originalUrl ? (
            <>
              <ImageThumbnail
                src={originalUrl}
                alt={`Original slide ${slideIndex + 1}`}
                width={280}
                height={350}
                className="opacity-60"
              />
              <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                Original
              </span>
            </>
          ) : (
            <div className="aspect-[4/5] rounded-xl bg-muted flex items-center justify-center">
              <ImageOff className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Generated */}
        <div className="relative">
          {image.status === "completed" && image.image_url ? (
            isRetrying ? (
              <div className="aspect-[2/3] rounded-xl bg-muted flex flex-col items-center justify-center gap-1.5">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] text-muted-foreground">Regenerating...</p>
              </div>
            ) : (
              <>
                <ImageThumbnail
                  src={image.image_url}
                  alt={`Generated slide ${slideIndex + 1}`}
                  width={280}
                  height={350}
                />
                <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full leading-none">
                  Generated
                </span>
                <button
                  onClick={() => onRetryImage(image.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                  title="Regenerate"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </>
            )
          ) : image.status === "failed" ? (
            <div className="aspect-[4/5] rounded-xl bg-destructive/10 flex flex-col items-center justify-center gap-1.5 p-3">
              {isRetrying ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] text-muted-foreground">Retrying...</p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-[10px] text-destructive text-center line-clamp-2">
                    {image.error_message || "Failed"}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-6 gap-1"
                    onClick={() => onRetryImage(image.id)}
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="aspect-[4/5] rounded-xl bg-muted flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <span className="text-[10px] text-muted-foreground">
        Slide {slideIndex + 1}
      </span>
    </div>
  );
}

function SetContent({
  set,
  originalImages,
  onRetryImage,
  retryingId,
}: {
  set: GenerationSetWithImages;
  originalImages: string[];
  onRetryImage: (imageId: string) => void;
  retryingId: string | null;
}) {
  const handleDownload = () => {
    downloadSetAsZip(set.id, `carousel_${set.id.slice(0, 8)}.zip`);
  };

  const sortedImages = [...set.generated_images].sort(
    (a, b) => a.slide_index - b.slide_index
  );

  return (
    <div className="space-y-4">
      {/* Schedule controls + Download ZIP — directly below tab bar / set heading */}
      <ScheduleControls
        setId={set.id}
        initialChannelId={set.channel_id}
        initialScheduledAt={set.scheduled_at}
        initialPostedAt={set.posted_at}
        onDownload={set.generated_images.some((i) => i.status === "completed") ? handleDownload : undefined}
      />

      {/* Comparison grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedImages.map((img) => (
          <ComparisonCard
            key={img.id}
            slideIndex={img.slide_index}
            originalUrl={originalImages[img.slide_index]}
            image={img}
            onRetryImage={onRetryImage}
            retryingId={retryingId}
          />
        ))}
      </div>

      {/* Status badge */}
      <div className="flex items-center">
        <Badge variant={statusBadgeVariant(set.status)}>{set.status}</Badge>
      </div>
    </div>
  );
}

export function ResultsSection({
  sets,
  originalImages,
  onRetryImage,
  retryingId,
}: ResultsSectionProps) {
  if (sets.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Results</h3>
        <ResultsEmptyState />
      </div>
    );
  }

  if (sets.length === 1) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Results</h3>
        <SetContent
          set={sets[0]}
          originalImages={originalImages}
          onRetryImage={onRetryImage}
          retryingId={retryingId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground">Results</h3>
      <Tabs defaultValue="0">
        <TabsList>
          {sets.map((set, i) => (
            <TabsTrigger key={set.id} value={String(i)} className="gap-1.5">
              Set {set.set_index + 1}
              <Badge
                variant={statusBadgeVariant(set.status)}
                className="text-[10px] px-1.5 py-0"
              >
                {set.status}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
        {sets.map((set, i) => (
          <TabsContent key={set.id} value={String(i)} className="mt-3 data-[state=inactive]:hidden" forceMount>
            <SetContent
              set={set}
              originalImages={originalImages}
              onRetryImage={onRetryImage}
              retryingId={retryingId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
