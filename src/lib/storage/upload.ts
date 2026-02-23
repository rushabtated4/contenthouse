import { createServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

type BucketName = "originals" | "generated" | "overlays" | "backgrounds";

interface UploadResult {
  url: string;
  path: string;
}

export async function uploadToStorage(
  bucket: BucketName,
  buffer: Buffer,
  fileExtension: string,
  folder?: string
): Promise<UploadResult> {
  const supabase = createServerClient();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  const contentType =
    fileExtension === "png"
      ? "image/png"
      : fileExtension === "jpg" || fileExtension === "jpeg"
        ? "image/jpeg"
        : fileExtension === "webp"
          ? "image/webp"
          : "application/octet-stream";

  const { error } = await supabase.storage
    .from(bucket)
    .upload(filePath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { url: publicUrl, path: filePath };
}
