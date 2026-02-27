import { getReplicateClient } from "./client";

interface NanaBananaOptions {
  prompt: string;
  imageUrl: string;
  numImages?: number;
  aspectRatio?: string;
}

interface NanaBananaResult {
  imageUrls: string[];
}

export async function generateWithNanoBanana(
  options: NanaBananaOptions
): Promise<NanaBananaResult> {
  const replicate = getReplicateClient();
  const { prompt, imageUrl, numImages = 1, aspectRatio = "3:4" } = options;

  // Nano Banana Pro returns 1 image per call, so run multiple in parallel
  const promises = Array.from({ length: numImages }, () =>
    replicate.run("google/nano-banana-pro", {
      input: {
        prompt,
        image_input: [imageUrl],
        aspect_ratio: aspectRatio,
        output_format: "png",
        safety_filter_level: "block_only_high",
      },
    })
  );

  const results = await Promise.all(promises);

  // Output is a single URI string per call
  const imageUrls = results.map((output) => String(output));

  return { imageUrls };
}
