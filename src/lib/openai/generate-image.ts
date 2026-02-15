import { getOpenAIClient } from "./client";

interface GenerateImageParams {
  originalImageBuffer: Buffer;
  prompt: string;
  overlayImageBuffer?: Buffer;
  qualityInput: "low" | "high";
  qualityOutput: "low" | "medium" | "high";
  outputFormat: "png" | "jpeg" | "webp";
}

interface GenerateImageResult {
  imageBuffer: Buffer;
}

export async function generateImage(
  params: GenerateImageParams
): Promise<GenerateImageResult> {
  const openai = getOpenAIClient();

  // Build the images array for the edit endpoint
  const originalBlob = new Blob([new Uint8Array(params.originalImageBuffer)], {
    type: "image/png",
  });
  const originalFile = new File([originalBlob], "original.png", {
    type: "image/png",
  });

  const images: File[] = [originalFile];

  if (params.overlayImageBuffer) {
    const overlayBlob = new Blob(
      [new Uint8Array(params.overlayImageBuffer)],
      { type: "image/png" }
    );
    const overlayFile = new File([overlayBlob], "overlay.png", {
      type: "image/png",
    });
    images.push(overlayFile);
  }

  const response = await openai.images.edit({
    model: "gpt-image-1.5",
    image: images,
    prompt: params.prompt,
    n: 1,
    size: "1024x1536", // Closest 4:5 ratio, resized to 1080x1350 after
    quality: params.qualityOutput,
    input_fidelity: params.qualityInput,
  });

  const imageData = response.data?.[0];

  if (!imageData?.b64_json) {
    throw new Error("No image data returned from OpenAI");
  }

  const imageBuffer = Buffer.from(imageData.b64_json, "base64");
  return { imageBuffer };
}
