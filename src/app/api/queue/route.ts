import { NextRequest, NextResponse } from "next/server";
import { processBatch } from "@/lib/queue/processor";
import { createServerClient } from "@/lib/supabase/server";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let setId: string | undefined;
  try {
    const body = await request.json();
    setId = body.setId;
    const batchStart = body.batchStart;

    if (!setId) {
      return NextResponse.json(
        { error: "setId is required" },
        { status: 400 }
      );
    }

    const result = await processBatch(setId, batchStart || 0);

    // Self-chain: if more images remain, fire next batch
    if (result.hasMore) {
      const baseUrl = request.nextUrl.origin;
      fetch(`${baseUrl}/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setId,
          batchStart: result.nextBatchStart,
        }),
      }).catch(async (err) => {
        console.error(`Failed to chain batch for set ${setId}:`, err);
        // Mark set as failed so it doesn't stay stuck at "processing"
        const supabase = createServerClient();
        await supabase
          .from("generation_sets")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", setId!)
          .in("status", ["processing"]);
      });
    }

    return NextResponse.json({
      processed: result.processed,
      hasMore: result.hasMore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Queue process error:", message);
    // Ensure the set doesn't stay stuck at "processing"
    if (setId) {
      try {
        const supabase = createServerClient();
        await supabase
          .from("generation_sets")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", setId)
          .in("status", ["queued", "processing"]);
      } catch (dbErr) {
        console.error(`Failed to mark set ${setId} as failed:`, dbErr);
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
