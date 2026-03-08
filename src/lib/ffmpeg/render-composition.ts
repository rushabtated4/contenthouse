import { spawn } from "child_process";
import { writeFile, unlink, readFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { VideoTextOverlay } from "@/types/hook-editor";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require("ffmpeg-static");

function runFfmpeg(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: "pipe" });
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

function ffprobe(filePath: string): Promise<{ width: number; height: number }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ffprobePath: string = require("ffmpeg-static").replace(/ffmpeg$/, "ffprobe");
  return new Promise((resolve, reject) => {
    // Use ffmpeg to probe since ffprobe may not be available
    const proc = spawn(ffmpegPath, ["-i", filePath, "-hide_banner"], { stdio: "pipe" });
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("close", () => {
      // Parse dimensions from ffmpeg output like "1080x1920"
      const match = stderr.match(/(\d{2,5})x(\d{2,5})/);
      if (match) {
        resolve({ width: parseInt(match[1]), height: parseInt(match[2]) });
      } else {
        // Default to 1080x1920
        resolve({ width: 1080, height: 1920 });
      }
    });
    proc.on("error", reject);
  });
}

const FONT_WEIGHT_MAP: Record<number, string> = {
  400: "TikTokSans-Regular.ttf",
  500: "TikTokSans-Regular.ttf",
  600: "TikTokSans-Medium.ttf",
  700: "TikTokSans-Bold.ttf",
  800: "TikTokSans-ExtraBold.ttf",
};

function hexToFfmpeg(hex: string): string {
  // FFmpeg drawtext uses format like "0xRRGGBB" or color names
  return hex.replace("#", "0x");
}

function escapeDrawtext(text: string): string {
  // Escape special chars for FFmpeg drawtext filter
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%")
    .replace(/\n/g, "\\n");
}

function buildDrawtextFilter(
  overlay: VideoTextOverlay,
  videoWidth: number,
  videoHeight: number,
  fontDir: string,
): string {
  const fontFile = join(fontDir, FONT_WEIGHT_MAP[overlay.fontWeight] || "TikTokSans-Bold.ttf");
  const scaleFactor = videoWidth / 1080;
  const fontSize = Math.round(overlay.fontSize * scaleFactor);

  // Apply text transform
  let text = overlay.text;
  if (overlay.textTransform === "uppercase") text = text.toUpperCase();
  else if (overlay.textTransform === "lowercase") text = text.toLowerCase();

  // Calculate x position based on alignment
  const xPx = Math.round((overlay.x / 100) * videoWidth);
  const widthPx = Math.round((overlay.width / 100) * videoWidth);
  const yPx = Math.round((overlay.y / 100) * videoHeight);

  let xExpr: string;
  if (overlay.alignment === "center") {
    xExpr = `${xPx}+(${widthPx}-text_w)/2`;
  } else if (overlay.alignment === "right") {
    xExpr = `${xPx}+${widthPx}-text_w`;
  } else {
    xExpr = `${xPx}`;
  }

  const parts: string[] = [
    `fontfile='${fontFile}'`,
    `text='${escapeDrawtext(text)}'`,
    `fontsize=${fontSize}`,
    `fontcolor=${hexToFfmpeg(overlay.color)}`,
    `x=${xExpr}`,
    `y=${yPx}`,
    `enable='between(t,${overlay.startTime},${overlay.endTime})'`,
  ];

  // Shadow
  if (overlay.hasShadow) {
    parts.push(`shadowcolor=${hexToFfmpeg(overlay.shadowColor)}`);
    parts.push(`shadowx=${Math.round(overlay.shadowOffsetX * scaleFactor)}`);
    parts.push(`shadowy=${Math.round(overlay.shadowOffsetY * scaleFactor)}`);
  }

  // Stroke
  if (overlay.hasStroke && overlay.strokeWidth > 0) {
    parts.push(`borderw=${Math.round(overlay.strokeWidth * scaleFactor)}`);
    parts.push(`bordercolor=${hexToFfmpeg(overlay.strokeColor)}`);
  }

  // Background box
  if (overlay.backgroundOpacity > 0) {
    const boxColor = hexToFfmpeg(overlay.backgroundColor);
    const alpha = overlay.backgroundOpacity.toFixed(2);
    parts.push(`box=1`);
    parts.push(`boxcolor=${boxColor}@${alpha}`);
    parts.push(`boxborderw=${Math.round(overlay.backgroundPadding * scaleFactor)}`);
  }

  return `drawtext=${parts.join(":")}`;
}

export async function renderComposition(opts: {
  hookVideoBuffer: Buffer;
  textOverlays: VideoTextOverlay[];
  demoVideoBuffer: Buffer | null;
  fontDir: string;
}): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "render-"));
  const hookPath = join(dir, "hook.mp4");
  const outputPath = join(dir, "output.mp4");

  try {
    await writeFile(hookPath, opts.hookVideoBuffer);
    const dims = await ffprobe(hookPath);

    if (opts.demoVideoBuffer) {
      // With demo: normalize + text burn-in on hook, then concat
      const demoPath = join(dir, "demo.mp4");
      const hookProcessedPath = join(dir, "hook_processed.mp4");
      const demoProcessedPath = join(dir, "demo_processed.mp4");

      await writeFile(demoPath, opts.demoVideoBuffer);

      // Build drawtext filter chain for hook video
      const drawtextFilters = opts.textOverlays.map((o) =>
        buildDrawtextFilter(o, dims.width, dims.height, opts.fontDir)
      );

      const hookFilter = drawtextFilters.length > 0
        ? drawtextFilters.join(",")
        : "null";

      // Process hook: apply text + normalize to 1080x1920
      await runFfmpeg([
        "-y",
        "-i", hookPath,
        "-vf", `scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,${hookFilter}`,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-movflags", "+faststart",
        hookProcessedPath,
      ]);

      // Process demo: normalize to same dimensions
      await runFfmpeg([
        "-y",
        "-i", demoPath,
        "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264",
        "-c:a", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-movflags", "+faststart",
        demoProcessedPath,
      ]);

      // Concat with filter_complex
      const concatListPath = join(dir, "concat.txt");
      await writeFile(concatListPath, `file '${hookProcessedPath}'\nfile '${demoProcessedPath}'\n`);

      await runFfmpeg([
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concatListPath,
        "-c:v", "libx264",
        "-c:a", "aac",
        "-movflags", "+faststart",
        outputPath,
      ]);

      // Cleanup intermediate files
      await unlink(demoPath).catch(() => {});
      await unlink(hookProcessedPath).catch(() => {});
      await unlink(demoProcessedPath).catch(() => {});
      await unlink(concatListPath).catch(() => {});
    } else {
      // No demo: just burn text onto hook video
      if (opts.textOverlays.length === 0) {
        // No changes needed, just copy
        await runFfmpeg([
          "-y",
          "-i", hookPath,
          "-c", "copy",
          "-movflags", "+faststart",
          outputPath,
        ]);
      } else {
        const drawtextFilters = opts.textOverlays.map((o) =>
          buildDrawtextFilter(o, dims.width, dims.height, opts.fontDir)
        );

        await runFfmpeg([
          "-y",
          "-i", hookPath,
          "-vf", drawtextFilters.join(","),
          "-c:v", "libx264",
          "-c:a", "aac",
          "-movflags", "+faststart",
          outputPath,
        ]);
      }
    }

    return await readFile(outputPath);
  } finally {
    await unlink(hookPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
