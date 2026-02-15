"use client";

import { VideoCard } from "./video-card";
import { VideoGridSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useVideos } from "@/hooks/use-videos";

export function VideoGrid() {
  const { videos, total, hasMore, loading, loadingMore, error, loadMore, refetch } =
    useVideos({ limit: 24 });

  if (loading) return <VideoGridSkeleton />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (videos.length === 0) {
    return (
      <EmptyState
        title="No carousels yet"
        description="Paste a TikTok carousel URL in the Generate tab to get started."
        action={
          <Link href="/generate">
            <Button>Go to Generate</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sources</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {total} carousels
        </p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            disabled={loadingMore}
            onClick={loadMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              `Load more (${videos.length} of ${total})`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
