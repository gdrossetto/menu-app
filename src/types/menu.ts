import type { Database } from "./supabase";

export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type MenuView = Database["public"]["Tables"]["menu_views"]["Row"];

export interface MenuData {
  restaurant: Restaurant;
  categories: Category[];
  items: MenuItem[];
}

export interface MenuImportDraftItem {
  id: string;
  name: string;
  description: string;
  price: string;
}

export interface MenuImportDraftCategory {
  id: string;
  name: string;
  items: MenuImportDraftItem[];
}

export interface MenuImportProposal {
  sourceFileName: string;
  detectedLanguage: string | null;
  warnings: string[];
  categories: MenuImportDraftCategory[];
}
