import { NextRequest, NextResponse } from "next/server";
import { uploadToStorage } from "@/lib/storage/upload";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Extract video ID from TikTok URL
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    const tiktokVideoId = videoIdMatch?.[1] || null;

    // Use RapidAPI to get download URL
    const rapidRes = await fetch(
      `https://${process.env.RAPIDAPI_TIKTOK_HOST}/api/download/video?url=${encodeURIComponent(url)}`,
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
          "x-rapidapi-host": process.env.RAPIDAPI_TIKTOK_HOST!,
        },
      }
    );

    if (!rapidRes.ok) {
      throw new Error(`TikTok API returned ${rapidRes.status}`);
    }

    const rapidData = await rapidRes.json();

    // Extract download URL from response
    const downloadUrl =
      rapidData?.play ||
      rapidData?.play_watermark ||
      rapidData?.data?.play ||
      rapidData?.data?.hdplay ||
      rapidData?.data?.wmplay;

    if (!downloadUrl) {
      throw new Error("Could not extract video download URL");
    }

    // Download the video
    const videoRes = await fetch(downloadUrl);
    if (!videoRes.ok) throw new Error("Failed to download video");

    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const { url: storedUrl } = await uploadToStorage("hook-videos", videoBuffer, "mp4", "source");

    // Best-effort: fetch stats via post detail endpoint
    let stats: { playCount: number; diggCount: number; commentCount: number; shareCount: number; collectCount: number } | null = null;
    if (tiktokVideoId) {
      try {
        const statsRes = await fetch(
          `https://${process.env.RAPIDAPI_TIKTOK_HOST}/api/post/detail?videoId=${tiktokVideoId}`,
          {
            headers: {
              "x-rapidapi-key": process.env.RAPIDAPI_KEY!,
              "x-rapidapi-host": process.env.RAPIDAPI_TIKTOK_HOST!,
            },
          }
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const s = statsData?.itemInfo?.itemStruct?.stats;
          if (s) {
            stats = {
              playCount: Number(s.playCount) || 0,
              diggCount: Number(s.diggCount) || 0,
              commentCount: Number(s.commentCount) || 0,
              shareCount: Number(s.shareCount) || 0,
              collectCount: Number(s.collectCount) || 0,
            };
          }
        }
      } catch {
        // Non-blocking — stats are optional
      }
    }

    return NextResponse.json({
      videoUrl: storedUrl,
      tiktokVideoId,
      stats,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
