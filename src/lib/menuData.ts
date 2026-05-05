import { supabase } from "./supabase";
import type { Category, MenuData, MenuItem, Restaurant } from "../types/menu";

export async function fetchRestaurantByOwner(
  ownerId: string,
): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", ownerId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error fetching restaurant:", error);
    return null;
  }

  return data;
}

export async function fetchMenuData(restaurantId: string): Promise<MenuData> {
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", restaurantId)
    .single();

  if (restaurantError || !restaurant) {
    throw new Error(restaurantError?.message || "Restaurant not found.");
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("order_index");

  if (categoriesError) {
    throw new Error(categoriesError.message);
  }

  const categoryIds = (categories ?? []).map((category) => category.id);
  const items = await fetchItemsForCategories(categoryIds);

  return {
    restaurant,
    categories: categories ?? [],
    items,
  };
}

async function fetchItemsForCategories(categoryIds: string[]): Promise<MenuItem[]> {
  if (categoryIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .in("category_id", categoryIds)
    .order("order_index");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function sortItemsForCategory(
  items: MenuItem[],
  category: Category,
): MenuItem[] {
  return items
    .filter((item) => item.category_id === category.id)
    .sort((a, b) => a.order_index - b.order_index);
}
