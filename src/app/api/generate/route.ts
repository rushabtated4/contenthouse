import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import type { GenerateRequest } from "@/types/api";

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const {
      videoId,
      selectedSlides,
      firstSlidePrompt,
      otherSlidesPrompt,
      perSlidePrompts,
      perSlideOverlays,
      qualityInput,
      qualityOutput,
      outputFormat,
      numSets,
    } = body;

    if (!videoId || !selectedSlides?.length) {
      return NextResponse.json(
        { error: "videoId and selectedSlides are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const batchId = uuidv4();
    const sets = [];

    // Create generation sets and their image records
    for (let setIndex = 0; setIndex < numSets; setIndex++) {
      const { data: set, error: setError } = await supabase
        .from("generation_sets")
        .insert({
          video_id: videoId,
          set_index: setIndex,
          batch_id: batchId,
          first_slide_prompt: firstSlidePrompt || null,
          other_slides_prompt: otherSlidesPrompt || null,
          quality_input: qualityInput,
          quality_output: qualityOutput,
          output_format: outputFormat,
          selected_slides: selectedSlides,
          status: "queued",
          progress_current: 0,
          progress_total: selectedSlides.length,
        })
        .select()
        .single();

      if (setError) throw setError;

      // Create generated_images records for each selected slide
      const imageRecords = selectedSlides.map((slideIndex) => ({
        set_id: set.id,
        slide_index: slideIndex,
        per_slide_prompt: perSlidePrompts?.[slideIndex] || null,
        overlay_image_url: perSlideOverlays?.[slideIndex] || null,
        status: "pending",
      }));

      const { error: imgError } = await supabase
        .from("generated_images")
        .insert(imageRecords);

      if (imgError) throw imgError;

      sets.push(set);
    }

    // Kick off queue processing for each set (fire-and-forget)
    const baseUrl = request.nextUrl.origin;
    for (const set of sets) {
      fetch(`${baseUrl}/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setId: set.id, batchStart: 0 }),
      }).catch((err) =>
        console.error(`Failed to start queue for set ${set.id}:`, err)
      );
    }

    return NextResponse.json({ batchId, sets });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
