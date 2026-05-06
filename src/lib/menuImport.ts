import { supabase } from "./supabase";
import type {
  MenuImportDraftCategory,
  MenuImportDraftItem,
  MenuImportProposal,
} from "../types/menu";

interface RawMenuImportDraftItem {
  name?: string;
  description?: string | null;
  price?: string | number | null;
}

interface RawMenuImportDraftCategory {
  name?: string;
  items?: RawMenuImportDraftItem[] | null;
}

interface RawMenuImportResponse {
  sourceFileName?: string;
  detectedLanguage?: string | null;
  warnings?: string[] | null;
  categories?: RawMenuImportDraftCategory[] | null;
}

export async function extractMenuImportProposal(
  file: File,
): Promise<MenuImportProposal> {
  const fileData = await readFileAsBase64(file);

  const { data, error } = await supabase.functions.invoke("menu-import", {
    body: {
      fileName: file.name,
      mimeType: file.type,
      fileData,
    },
  });

  if (error) {
    throw new Error(error.message || "Failed to analyze menu file.");
  }

  return normalizeMenuImportResponse(data, file.name);
}

export function updateImportCategory(
  proposal: MenuImportProposal,
  categoryId: string,
  updater: (category: MenuImportDraftCategory) => MenuImportDraftCategory,
): MenuImportProposal {
  return {
    ...proposal,
    categories: proposal.categories.map((category) =>
      category.id === categoryId ? updater(category) : category,
    ),
  };
}

export function updateImportItem(
  proposal: MenuImportProposal,
  categoryId: string,
  itemId: string,
  updater: (item: MenuImportDraftItem) => MenuImportDraftItem,
): MenuImportProposal {
  return updateImportCategory(proposal, categoryId, (category) => ({
    ...category,
    items: category.items.map((item) => (item.id === itemId ? updater(item) : item)),
  }));
}

function normalizeMenuImportResponse(
  raw: RawMenuImportResponse,
  fallbackFileName: string,
): MenuImportProposal {
  const categories = (raw.categories ?? [])
    .map((category) => ({
      id: crypto.randomUUID(),
      name: (category.name || "").trim(),
      items: (category.items ?? [])
        .map((item) => ({
          id: crypto.randomUUID(),
          name: (item.name || "").trim(),
          description: (item.description || "").trim(),
          price: normalizeImportedPriceText(item.price),
        }))
        .filter((item) => item.name),
    }))
    .filter((category) => category.name || category.items.length > 0);

  return {
    sourceFileName: raw.sourceFileName || fallbackFileName,
    detectedLanguage: raw.detectedLanguage || null,
    warnings: (raw.warnings ?? []).filter(Boolean),
    categories,
  };
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file."));
    };

    reader.readAsDataURL(file);
  });
}

function normalizeImportedPriceText(value: string | number | null | undefined) {
  const rawValue = String(value ?? "").trim();
  const sanitized = rawValue.replace(/[^\d,.-]/g, "").trim();

  if (!sanitized) {
    return "";
  }

  const normalized = sanitized.includes(",") && !sanitized.includes(".")
    ? sanitized.replace(",", ".")
    : sanitized.replace(/,/g, "");

  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return normalized;
}
