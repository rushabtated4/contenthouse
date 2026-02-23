import { Suspense } from "react";
import { VideoGrid } from "@/components/carousel/video-grid";
import { VideoGridSkeleton } from "@/components/shared/loading-skeleton";

export default function VideosPage() {
  return (
    <Suspense fallback={<VideoGridSkeleton />}>
      <VideoGrid />
    </Suspense>
  );
}
