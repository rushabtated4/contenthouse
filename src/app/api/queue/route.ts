import { NextRequest, NextResponse } from "next/server";
import { processBatch } from "@/lib/queue/processor";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const { setId, batchStart } = await request.json();

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
      }).catch((err) =>
        console.error(`Failed to chain batch for set ${setId}:`, err)
      );
    }

    return NextResponse.json({
      processed: result.processed,
      hasMore: result.hasMore,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Queue process error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
