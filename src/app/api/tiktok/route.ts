import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { fetchTikTokPost } from "@/lib/tiktok/client";
import { downloadImage } from "@/lib/storage/download";
import { uploadToStorage } from "@/lib/storage/upload";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check for existing video (dedup by URL)
    const { data: existing } = await supabase
      .from("videos")
      .select("*")
      .eq("url", url)
      .single();

    if (existing) {
      return NextResponse.json({ video: existing, isExisting: true });
    }

    // Fetch from TikTok API
    const postData = await fetchTikTokPost(url);

    if (!postData.isCarousel || postData.imageUrls.length === 0) {
      return NextResponse.json(
        { error: "This post is not a carousel or has no images. Use the manual upload fallback." },
        { status: 400 }
      );
    }

    // Download and store original images to Supabase Storage
    const storedImageUrls: string[] = [];
    for (const imageUrl of postData.imageUrls) {
      try {
        const buffer = await downloadImage(imageUrl);
        const { url: storageUrl } = await uploadToStorage(
          "originals",
          buffer,
          "png",
          postData.videoId
        );
        storedImageUrls.push(storageUrl);
      } catch (err) {
        console.error("Failed to store original image:", err);
        storedImageUrls.push(imageUrl); // Fallback to CDN URL
      }
    }

    // Insert into videos table
    const { data: video, error: insertError } = await supabase
      .from("videos")
      .insert({
        video_id: postData.videoId,
        url,
        description: postData.description,
        hashtags: postData.hashtags,
        views: postData.views,
        likes: postData.likes,
        comments: postData.comments,
        shares: postData.shares,
        posted_at: postData.postedAt,
        original_images: storedImageUrls,
      })
      .select()
      .single();

    if (insertError) {
      // If it's a unique constraint violation, try to fetch existing
      if (insertError.code === "23505") {
        const { data: existing } = await supabase
          .from("videos")
          .select("*")
          .eq("url", url)
          .single();
        return NextResponse.json({ video: existing, isExisting: true });
      }
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: `Database error: ${insertError.message || insertError.code || JSON.stringify(insertError)}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ video, isExisting: false });
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null
          ? JSON.stringify(err)
          : String(err);
    console.error("TikTok fetch error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
