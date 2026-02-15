import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();

    const [
      setsRes,
      imagesRes,
      completedSetsRes,
      postedSetsRes,
      recentSetsRes,
    ] = await Promise.all([
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("generated_images")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed"),
      supabase
        .from("generation_sets")
        .select("*", { count: "exact", head: true })
        .not("posted_at", "is", null),
      supabase
        .from("generation_sets")
        .select(`
          id,
          status,
          created_at,
          title,
          progress_current,
          progress_total,
          scheduled_at,
          posted_at,
          videos:video_id(description),
          generated_images(image_url, status, slide_index)
        `)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const totalSets = setsRes.count || 0;
    const totalImages = imagesRes.count || 0;

    const recentSets = (recentSetsRes.data || []).map((s: Record<string, unknown>) => {
      const video = s.videos as Record<string, unknown> | null;
      const images = (s.generated_images as Array<Record<string, unknown>>) || [];
      const firstCompleted = images
        .filter((i) => i.status === "completed" && i.image_url)
        .sort((a, b) => (a.slide_index as number) - (b.slide_index as number))[0];

      return {
        id: s.id,
        status: s.status,
        created_at: s.created_at,
        video_description: (s.title as string) || video?.description || null,
        thumbnail_url: (firstCompleted?.image_url as string) || null,
        progress_current: s.progress_current,
        progress_total: s.progress_total,
        scheduled_at: s.scheduled_at,
        posted_at: s.posted_at,
      };
    });

    return NextResponse.json({
      totalVideos: 0,
      totalSets,
      totalImages,
      estimatedCost: 0,
      completedSets: completedSetsRes.count || 0,
      failedSets: 0,
      scheduledSets: 0,
      postedSets: postedSetsRes.count || 0,
      failedImages: 0,
      recentSets,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
