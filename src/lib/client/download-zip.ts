import { zipSync } from "fflate";

interface ImageEntry {
  url: string;
  filename: string;
}

/**
 * Downloads all images for a generation set directly from CDN in the browser,
 * creates a ZIP with fflate, and triggers a download.
 *
 * Much faster than the server-side route because images are fetched in parallel
 * directly from Supabase CDN without a server round-trip.
 */
export async function downloadSetAsZip(
  setId: string,
  filename: string
) {
  // Get image URLs from the API (lightweight — just a DB query)
  const res = await fetch(`/api/images/${setId}/download?urls=1`);
  if (!res.ok) throw new Error("Failed to get image URLs");
  const { images }: { images: ImageEntry[] } = await res.json();

  // Download all images in parallel directly from CDN
  const downloads = await Promise.all(
    images.map(async (entry) => {
      const imgRes = await fetch(entry.url);
      if (!imgRes.ok) throw new Error(`Failed to download ${entry.filename}`);
      const buffer = await imgRes.arrayBuffer();
      return { name: entry.filename, data: new Uint8Array(buffer) };
    })
  );

  // Build fflate file map
  const files: Record<string, Uint8Array> = {};
  for (const { name, data } of downloads) {
    files[name] = data;
  }

  // Zip synchronously (downloads are already done) and trigger download
  const zipped = zipSync(files);
  const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format a date string as YYYY-MM-DD for use in filenames */
export function formatDateForFilename(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

/** Sanitize a string for use in a filename (replace spaces/special chars) */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-]/g, "_").replace(/_+/g, "_");
}
