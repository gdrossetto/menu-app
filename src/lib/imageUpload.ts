import { supabase } from "./supabase";
import { compressImage } from "./imageOptimization";
import { logger } from "./logger";

export class ImageUploadError extends Error {
  readonly details?: {
    statusCode?: string;
    hint?: string;
  };

  constructor(
    message: string,
    details?: {
      statusCode?: string;
      hint?: string;
    },
  ) {
    super(message);
    this.name = "ImageUploadError";
    this.details = details;
  }
}

export async function uploadMenuImage(
  rawFile: File,
  restaurantId: string,
  options: { maxWidth?: number; quality?: number; prefix?: string } = {},
): Promise<string | null> {
  const { maxWidth = 800, quality = 0.8, prefix } = options;
  const file = await compressImage(rawFile, maxWidth, quality);
  const fileExt = file.name.split(".").pop() || "webp";
  const fileName = `${prefix ? `${prefix}_` : ""}${Math.random()
    .toString(36)
    .substring(2, 15)}.${fileExt}`;
  const filePath = `${restaurantId}/${fileName}`;

  const { error } = await supabase.storage
    .from("menu-images")
    .upload(filePath, file, {
      contentType: file.type || rawFile.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    const isStoragePolicyError =
      error.message.toLowerCase().includes("row-level security") ||
      error.message.toLowerCase().includes("permission") ||
      error.message.toLowerCase().includes("not authorized");

    logger.error("Failed to upload menu image.", error, {
      restaurantId,
      filePath,
      fileType: file.type,
      fileSize: file.size,
      statusCode: error.statusCode,
    });
    throw new ImageUploadError(error.message, {
      statusCode: error.statusCode,
      hint: isStoragePolicyError
        ? "Check the menu-images storage policies for authenticated insert access."
        : undefined,
    });
  }

  const { data } = supabase.storage.from("menu-images").getPublicUrl(filePath);
  return data.publicUrl;
}
