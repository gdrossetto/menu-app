import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchMenuData } from "../lib/menuData";
import { logger } from "../lib/logger";
import type { Category, MenuItem, Restaurant } from "../types/menu";

export default function PrintMenu() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError("");

    try {
      const {
        restaurant: rest,
        categories: menuCategories,
        items: menuItems,
      } = await fetchMenuData(restaurantId);

      setRestaurant(rest);
      setCategories(menuCategories);
      setItems(menuItems.filter((item) => item.is_available));
      setLoading(false);

      setTimeout(() => {
        window.print();
      }, 500);
    } catch (menuError) {
      logger.error("Failed to load printable menu.", menuError, { restaurantId });
      setError("Restaurant not found.");
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void Promise.resolve().then(loadMenu);
  }, [loadMenu]);

  useEffect(() => {
    if (restaurant?.primary_color && restaurant.primary_color !== "#000000") {
      document.documentElement.style.setProperty(
        "--restaurant-primary",
        restaurant.primary_color,
      );
      return () => {
        document.documentElement.style.removeProperty("--restaurant-primary");
      };
    }

    document.documentElement.style.removeProperty("--restaurant-primary");
    return () => {
      document.documentElement.style.removeProperty("--restaurant-primary");
    };
  }, [restaurant?.primary_color]);

  if (loading) {
    return (
      <div className="p-8 text-center font-sans">
        <p>Loading printable menu...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="p-8 text-center font-sans">
        <h2>{error || "Menu not found"}</h2>
      </div>
    );
  }

  return (
    <div className="print-menu-page mx-auto min-h-screen max-w-[1000px] bg-white px-8 py-8 font-sans text-black">
      <header className="mb-12 text-center">
        {restaurant.logo_url && (
          <img
            src={restaurant.logo_url}
            alt={restaurant.name}
            className="mx-auto mb-4 h-20 object-contain"
          />
        )}
        <h1 className="m-0 text-[2.5rem] font-extrabold text-[var(--restaurant-primary,black)]">
          {restaurant.name}
        </h1>
        <p className="mt-2 italic text-[#666]">Menu</p>
      </header>

      <main
        className={categories.length > 2 ? "columns-2 gap-16" : "columns-1"}
      >
        {categories.map((category) => {
          const categoryItems = items.filter(
            (item) => item.category_id === category.id,
          );
          if (categoryItems.length === 0) return null;

          return (
            <section
              key={category.id}
              className="mb-10 break-inside-avoid-column"
            >
              <h2 className="mb-4 border-b-2 border-[var(--restaurant-primary,black)] pb-1 text-2xl font-bold text-[var(--restaurant-primary,black)]">
                {category.name}
              </h2>

              <div className="flex flex-col gap-5">
                {categoryItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-1">
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="m-0 text-[1.1rem] font-semibold">
                        {item.name}
                      </h3>
                      <div className="relative top-[-4px] mx-2 flex-1 border-b border-dotted border-[#ccc]" />
                      <span className="whitespace-nowrap font-bold">
                        {restaurant.currency_symbol || "$"}
                        {item.price.toFixed(2)}
                      </span>
                    </div>
                    {item.description && (
                      <p className="m-0 text-[0.9rem] leading-[1.4] text-[#555]">
                        {item.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="mt-16 border-t border-[#eee] pt-8 text-center text-[0.85rem] text-[#999]">
        <p>Powered by MenuQR</p>
      </footer>
    </div>
  );
}
