import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LoadingSpinner from "../components/LoadingSpinner";
import { supabase } from "../lib/supabase";
import { fetchMenuData } from "../lib/menuData";
import type { Category, MenuItem, Restaurant } from "../types/menu";

function setMetaTag(property: string, content: string) {
  let element = document.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export default function PublicMenu() {
  const { restaurantId } = useParams();
  const { t, i18n } = useTranslation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError("");

    try {
      const { restaurant: rest, categories: cats, items: menuItems } =
        await fetchMenuData(restaurantId);
      setRestaurant(rest);
      setCategories(cats);
      setActiveCategory(cats[0]?.id || "");
      setItems(menuItems);

      document.title = `${rest.name} - Menu`;
      setMetaTag("og:title", `${rest.name} - Menu`);
      setMetaTag("og:description", `View the digital menu for ${rest.name}.`);
      if (rest.logo_url) {
        setMetaTag("og:image", rest.logo_url);
      }

      const sessionKey = `viewed_${rest.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        void supabase.from("menu_views").insert({ restaurant_id: rest.id });
      }
    } catch (menuError) {
      console.error("Error loading public menu:", menuError);
      setError("Restaurant not found.");
    }

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    void Promise.resolve().then(loadMenu);
  }, [loadMenu]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 140;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const offsets = categories.map((category) => {
        const element = document.getElementById(`category-${category.id}`);
        return {
          id: category.id,
          top: element ? element.getBoundingClientRect().top : Infinity,
        };
      });

      const current = offsets.filter((offset) => offset.top <= 160).pop();
      if (current && current.id !== activeCategory) {
        setActiveCategory(current.id);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories, activeCategory]);

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
    return <LoadingSpinner />;
  }

  if (error || !restaurant) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <h2>{error || "Menu not found"}</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg pb-16">
      <header className="sticky top-0 z-10 bg-white/90 px-6 pt-10 pb-4 text-center shadow-[0_1px_0_rgba(0,0,0,0.03)] backdrop-blur-[10px]">
        <div className="absolute top-4 right-6">
          <select
            value={i18n.language.split("-")[0]}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            className="rounded-[0.5rem] border border-app-border bg-white px-2 py-1 text-[0.8rem]"
          >
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
        </div>

        {restaurant.logo_url && (
          <img
            src={restaurant.logo_url}
            alt={restaurant.name}
            className="mx-auto mb-4 h-[60px] rounded-[0.5rem]"
          />
        )}
        <h1 className="m-0 text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--restaurant-primary,var(--color-app-primary))]">
          {restaurant.name}
        </h1>

        {categories.length > 0 && (
          <div className="hide-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => scrollToCategory(category.id)}
                className={`whitespace-nowrap rounded-full px-5 py-2 text-[0.9rem] font-medium transition-all duration-200 ${
                  activeCategory === category.id
                    ? "bg-[var(--restaurant-primary,var(--color-app-primary))] text-white"
                    : "bg-app-surface-hover text-app-text-muted"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[600px] px-6 py-8">
        {categories.length === 0 ? (
          <p className="text-center text-app-text-muted">Menu is empty.</p>
        ) : (
          categories.map((category) => {
            const categoryItems = items.filter(
              (item) => item.category_id === category.id,
            );
            if (categoryItems.length === 0) return null;

            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="mb-14 scroll-mt-40"
              >
                <h2 className="mb-6 text-[1.4rem] font-semibold tracking-[-0.01em] text-[var(--restaurant-primary,var(--color-app-primary))]">
                  {category.name}
                </h2>
                <div className="flex flex-col gap-4">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`card flex overflow-hidden border-none bg-app-surface shadow-app-sm ${
                        item.is_available ? "" : "grayscale opacity-70"
                      }`}
                    >
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <h3 className="m-0 text-[1.1rem] font-semibold text-[var(--restaurant-primary,var(--color-app-primary))]">
                            {item.name}
                            {!item.is_available && (
                              <span className="ml-2 inline-flex rounded-[0.5rem] bg-app-border px-1.5 py-0.5 align-middle text-[0.7rem] font-semibold uppercase tracking-[0.05em] text-app-surface">
                                Out of Stock
                              </span>
                            )}
                          </h3>
                          <span className="whitespace-nowrap font-semibold text-app-text">
                            {restaurant.currency_symbol || "$"}
                            {item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p className="mt-2 text-[0.9rem] leading-[1.5] text-app-text-muted">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.image_url && (
                        <div
                          className="w-[120px] shrink-0 cursor-pointer p-3 pl-0"
                          onClick={() => setSelectedImage(item.image_url)}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full rounded-[0.5rem] object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <footer className="px-6 py-12 text-center text-[0.85rem]">
        <p className="text-app-text-muted">
          {t("publicMenu.poweredBy", "Powered by MenuQR")}
        </p>
      </footer>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-6 backdrop-blur-[4px]"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Full size preview"
            className="max-h-full max-w-full rounded-[0.5rem] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
