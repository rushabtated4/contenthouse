import { getReplicateClient } from "./client";

interface KlingOptions {
  imageUrl: string;
  videoUrl: string;
  prompt?: string;
  characterOrientation?: "image" | "video";
  mode?: "std" | "pro";
  keepOriginalSound?: boolean;
  webhookUrl?: string;
}

interface KlingPrediction {
  predictionId: string;
}

export async function createKlingPrediction(
  options: KlingOptions
): Promise<KlingPrediction> {
  const replicate = getReplicateClient();
  const {
    imageUrl,
    videoUrl,
    prompt = "",
    characterOrientation = "image",
    mode = "pro",
    keepOriginalSound = true,
    webhookUrl,
  } = options;

  const createOptions: Parameters<typeof replicate.predictions.create>[0] = {
    model: "kwaivgi/kling-v2.6-motion-control",
    input: {
      image: imageUrl,
      video: videoUrl,
      prompt,
      character_orientation: characterOrientation,
      mode,
      keep_original_sound: keepOriginalSound,
    },
  };

  // Only attach webhook if it's a valid HTTPS URL
  if (webhookUrl && webhookUrl.startsWith("https://")) {
    createOptions.webhook = webhookUrl;
    createOptions.webhook_events_filter = ["completed"];
  }

  const prediction = await replicate.predictions.create(createOptions);

  return { predictionId: prediction.id };
}

/**
 * Poll a prediction's status from Replicate API.
 */
export async function getPredictionStatus(predictionId: string) {
  const replicate = getReplicateClient();
  const prediction = await replicate.predictions.get(predictionId);
  return {
    status: prediction.status, // "starting" | "processing" | "succeeded" | "failed" | "canceled"
    output: prediction.output,
    error: prediction.error,
  };
}
