import sharp from "sharp";

interface StripMetadataParams {
  imageBuffer: Buffer;
  outputFormat: "png" | "jpeg" | "webp";
}

/**
 * Strips all metadata (EXIF, XMP, C2PA, Synth ID, PNG ancillary chunks)
 * and resizes to 1080x1350 (TikTok 4:5 carousel standard).
 */
export async function stripMetadataAndResize(
  params: StripMetadataParams
): Promise<Buffer> {
  const { imageBuffer, outputFormat } = params;

  let pipeline = sharp(imageBuffer)
    .resize(1080, 1350, {
      fit: "cover",
      position: "center",
    })
    .removeAlpha() // Remove alpha for JPEG compatibility
    .withMetadata({}); // Empty metadata = strip all

  // Re-add alpha for PNG/WebP if needed
  if (outputFormat === "png" || outputFormat === "webp") {
    pipeline = sharp(imageBuffer)
      .resize(1080, 1350, {
        fit: "cover",
        position: "center",
      })
      .withMetadata({});
  }

  switch (outputFormat) {
    case "png":
      return pipeline.png({ quality: 100 }).toBuffer();
    case "jpeg":
      return pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
    case "webp":
      return pipeline.webp({ quality: 95 }).toBuffer();
    default:
      return pipeline.png().toBuffer();
  }
}
