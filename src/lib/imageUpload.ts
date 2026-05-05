import { supabase } from "./supabase";
import { compressImage } from "./imageOptimization";

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
    .upload(filePath, file);

  if (error) {
    console.error("Error uploading image:", error);
    return null;
  }

  const { data } = supabase.storage.from("menu-images").getPublicUrl(filePath);
  return data.publicUrl;
}
