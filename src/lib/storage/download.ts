/**
 * Downloads an image from a URL and returns it as a Buffer.
 * Works with Supabase Storage URLs, TikTok CDN URLs, etc.
 */
export async function downloadImage(url: string): Promise<Buffer> {
  // Handle base64 data URLs (from blob URL conversion on client)
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download image: ${response.status} ${response.statusText}`
    );
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
