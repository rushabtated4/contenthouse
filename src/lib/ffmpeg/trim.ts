import { spawn } from "child_process";
import { writeFile, unlink, readFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// ffmpeg-static must be in serverExternalPackages in next.config.ts
// so Next.js doesn't bundle it and resolves the binary path correctly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegPath: string = require("ffmpeg-static");

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: "pipe" });
    let stderr = "";
    proc.stderr.on("data", (chunk) => (stderr += chunk.toString()));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-500)}`));
    });
    proc.on("error", reject);
  });
}

export async function trimVideo(
  inputBuffer: Buffer,
  startSeconds: number,
  endSeconds: number
): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "trim-"));
  const inputPath = join(dir, "input.mp4");
  const outputPath = join(dir, "output.mp4");

  try {
    await writeFile(inputPath, inputBuffer);

    const duration = endSeconds - startSeconds;
    await runFfmpeg([
      "-y",
      "-ss", startSeconds.toString(),
      "-i", inputPath,
      "-t", duration.toString(),
      "-c:v", "libx264",
      "-c:a", "aac",
      "-movflags", "+faststart",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

export async function extractFirstFrame(inputBuffer: Buffer): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "frame-"));
  const inputPath = join(dir, "input.mp4");
  const outputPath = join(dir, "frame.jpg");

  try {
    await writeFile(inputPath, inputBuffer);

    await runFfmpeg([
      "-y",
      "-i", inputPath,
      "-vframes", "1",
      "-f", "image2",
      "-q:v", "2",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
