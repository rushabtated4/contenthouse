import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { PassThrough } from "stream";
import type { AspectRatio } from "@/lib/editor/defaults";
import type { EditorExportRequest } from "@/types/editor";
import { renderSlide } from "@/lib/editor/render-slide";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body: EditorExportRequest = await request.json();
    const { slides, outputFormat } = body;
    const aspectRatio: AspectRatio = body.aspectRatio || "2:3";

    if (!slides?.length) {
      return NextResponse.json({ error: "No slides provided" }, { status: 400 });
    }

    const processedBuffers: { buffer: Buffer; index: number }[] = [];

    for (let i = 0; i < slides.length; i++) {
      const outputBuffer = await renderSlide(slides[i], outputFormat, aspectRatio);
      if (outputBuffer) {
        processedBuffers.push({ buffer: outputBuffer, index: i });
      }
    }

    // Create ZIP
    const zipBuffer = await new Promise<Buffer>((resolve, reject) => {
      const archive = archiver("zip", { zlib: { level: 5 } });
      const passthrough = new PassThrough();
      const chunks: Buffer[] = [];

      passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
      passthrough.on("end", () => resolve(Buffer.concat(chunks)));
      passthrough.on("error", reject);
      archive.on("error", reject);

      archive.pipe(passthrough);

      const ext = outputFormat === "jpeg" ? "jpg" : outputFormat;
      for (const { buffer, index } of processedBuffers) {
        archive.append(buffer, { name: `slide-${String(index + 1).padStart(2, "0")}.${ext}` });
      }

      archive.finalize();
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=editor-export.zip",
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Export failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
