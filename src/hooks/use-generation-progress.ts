"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GenerationSet, GeneratedImage } from "@/types/database";

interface ProgressState {
  sets: Record<string, GenerationSet>;
  images: Record<string, GeneratedImage>;
}

export function useGenerationProgress(batchId: string | null) {
  const [progress, setProgress] = useState<ProgressState>({
    sets: {},
    images: {},
  });

  useEffect(() => {
    if (!batchId) return;

    const supabase = createClient();

    // Initial fetch
    const fetchInitial = async () => {
      const { data: sets } = await supabase
        .from("generation_sets")
        .select("*")
        .eq("batch_id", batchId);

      const setMap: Record<string, GenerationSet> = {};
      const setIds: string[] = [];
      for (const s of sets || []) {
        setMap[s.id] = s as GenerationSet;
        setIds.push(s.id);
      }

      if (setIds.length > 0) {
        const { data: images } = await supabase
          .from("generated_images")
          .select("*")
          .in("set_id", setIds);

        const imgMap: Record<string, GeneratedImage> = {};
        for (const img of images || []) {
          imgMap[img.id] = img as GeneratedImage;
        }

        setProgress({ sets: setMap, images: imgMap });
      }
    };

    fetchInitial();

    // Subscribe to realtime changes on generation_sets
    const setsChannel = supabase
      .channel(`sets-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generation_sets",
          filter: `batch_id=eq.${batchId}`,
        },
        (payload) => {
          setProgress((prev) => ({
            ...prev,
            sets: {
              ...prev.sets,
              [payload.new.id]: payload.new as GenerationSet,
            },
          }));
        }
      )
      .subscribe();

    // Subscribe to realtime changes on generated_images
    const imagesChannel = supabase
      .channel(`images-${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "generated_images",
        },
        (payload) => {
          const img = payload.new as GeneratedImage;
          setProgress((prev) => {
            // Only update if this image belongs to one of our sets
            if (prev.sets[img.set_id]) {
              return {
                ...prev,
                images: { ...prev.images, [img.id]: img },
              };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(setsChannel);
      supabase.removeChannel(imagesChannel);
    };
  }, [batchId]);

  // Compute summary
  const sets = Object.values(progress.sets);
  const allImages = Object.values(progress.images);
  const totalImages = allImages.length;
  const completedImages = allImages.filter(
    (i) => i.status === "completed" || i.status === "failed"
  ).length;
  const isComplete = sets.length > 0 && sets.every(
    (s) => s.status === "completed" || s.status === "partial" || s.status === "failed"
  );

  return {
    sets,
    images: allImages,
    totalImages,
    completedImages,
    isComplete,
    progressPercent:
      totalImages > 0 ? Math.round((completedImages / totalImages) * 100) : 0,
  };
}
