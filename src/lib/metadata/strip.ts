import sharp from "sharp";

interface StripMetadataParams {
  imageBuffer: Buffer;
  outputFormat: "png" | "jpeg" | "webp";
}

/**
 * Strips all metadata (EXIF, XMP, C2PA, Synth ID, PNG ancillary chunks).
 * Preserves the original image dimensions (no resize).
 *
 * Note: sharp strips all metadata by default when .withMetadata() is NOT called.
 * Calling .withMetadata({}) (even with empty options) copies metadata from input — do not use it.
 */
export async function stripMetadataAndResize(
  params: StripMetadataParams
): Promise<Buffer> {
  const { imageBuffer, outputFormat } = params;

  let pipeline = sharp(imageBuffer)
    .removeAlpha(); // Remove alpha for JPEG compatibility

  // Re-add alpha support for PNG/WebP
  if (outputFormat === "png" || outputFormat === "webp") {
    pipeline = sharp(imageBuffer);
  }

  switch (outputFormat) {
    case "png":
      return pipeline.png({ quality: 90 }).toBuffer();
    case "jpeg":
      return pipeline.jpeg({ quality: 95, mozjpeg: true }).toBuffer();
    case "webp":
      return pipeline.webp({ quality: 95 }).toBuffer();
    default:
      return pipeline.png().toBuffer();
  }
}
