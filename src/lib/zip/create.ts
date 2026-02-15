import archiver from "archiver";
import { PassThrough } from "stream";
import { downloadImage } from "@/lib/storage/download";

interface ZipEntry {
  url: string;
  filename: string;
}

/**
 * Creates a ZIP archive from a list of image URLs.
 * Returns a readable stream of the ZIP data.
 */
export async function createZipFromUrls(
  entries: ZipEntry[]
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);

    archive.pipe(passthrough);

    for (const entry of entries) {
      try {
        const imageBuffer = await downloadImage(entry.url);
        archive.append(imageBuffer, { name: entry.filename });
      } catch (err) {
        console.error(
          `Failed to download ${entry.filename}:`,
          err
        );
      }
    }

    await archive.finalize();
  });
}
