import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  Globe,
  Image as ImageIcon,
  X,
} from "lucide-react";
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
  const [isScrolled, setIsScrolled] = useState(false);

  const visibleCategories = useMemo(
    () =>
      categories.filter((category) =>
        items.some((item) => item.category_id === category.id),
      ),
    [categories, items],
  );

  const loadMenu = useCallback(async () => {
    if (!restaurantId) return;

    setLoading(true);
    setError("");

    try {
      const { restaurant: rest, categories: cats, items: menuItems } =
        await fetchMenuData(restaurantId);

      setRestaurant(rest);
      setCategories(cats);
      setItems(menuItems);

      const sessionKey = `viewed_${rest.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        void supabase.from("menu_views").insert({ restaurant_id: rest.id });
      }
    } catch (menuError) {
      console.error("Error loading public menu:", menuError);
      setError("notFound");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void Promise.resolve().then(loadMenu);
  }, [loadMenu]);

  useEffect(() => {
    if (!restaurant) return;

    const menuTitle = `${restaurant.name} - ${t("publicMenu.menu", "Menu")}`;
    document.title = menuTitle;
    setMetaTag("og:title", menuTitle);
    setMetaTag(
      "og:description",
      t("publicMenu.ogDescription", {
        defaultValue: "View the digital menu for {{name}}.",
        name: restaurant.name,
      }),
    );

    if (restaurant.logo_url) {
      setMetaTag("og:image", restaurant.logo_url);
    }
  }, [restaurant, t, i18n.language]);

  const effectiveActiveCategory = visibleCategories.some(
    (category) => category.id === activeCategory,
  )
    ? activeCategory
    : (visibleCategories[0]?.id ?? "");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      let currentActiveId = visibleCategories[0]?.id ?? "";

      for (const category of visibleCategories) {
        const element = document.getElementById(`category-${category.id}`);
        if (element && window.scrollY >= element.offsetTop - 150) {
          currentActiveId = category.id;
        }
      }

      if (currentActiveId && currentActiveId !== effectiveActiveCategory) {
        setActiveCategory(currentActiveId);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [effectiveActiveCategory, visibleCategories]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);

    const element = document.getElementById(`category-${id}`);
    if (!element) return;

    const offset = 120;
    const bodyRect = document.body.getBoundingClientRect().top;
    const elementRect = element.getBoundingClientRect().top;
    const elementPosition = elementRect - bodyRect;
    const offsetPosition = elementPosition - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  if (loading) {
    return <LoadingSpinner label={t("publicMenu.loading", "Loading menu...")} />;
  }

  if (error || !restaurant) {
    return (
      <div className="flex h-screen items-center justify-center p-8 text-center">
        <h2>{t("publicMenu.notFound", "Menu not found")}</h2>
      </div>
    );
  }

  const currentLanguage = i18n.language.split("-")[0];
  const currencySymbol = restaurant.currency_symbol || "$";

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-900 selection:bg-slate-200">
      <div className="pointer-events-none absolute top-0 right-0 z-10 flex w-full justify-end p-4">
        <div className="pointer-events-auto relative">
          <Globe className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={currentLanguage}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            aria-label={t("common.language", "Language")}
            className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-8 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-3 w-3 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <header className="flex flex-col items-center px-6 pt-16 pb-8 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/50 bg-black text-white shadow-xl shadow-black/10">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8 opacity-50" />
          )}
        </div>
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-slate-900">
          {restaurant.name}
        </h1>
        <p className="text-sm font-medium text-slate-500">
          {t("publicMenu.digitalMenu", "Digital Menu")}
        </p>
      </header>

      {visibleCategories.length > 0 && (
        <div
          className={`sticky top-0 z-50 transition-all duration-300 ${
            isScrolled
              ? "border-b border-slate-200 bg-[#F8FAFC]/90 shadow-sm backdrop-blur-md"
              : "bg-transparent"
          }`}
        >
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="hide-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => scrollToCategory(category.id)}
                  className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                    effectiveActiveCategory === category.id
                      ? "bg-black text-white shadow-md shadow-black/10"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto mt-6 max-w-3xl px-4">
        {visibleCategories.length === 0 ? (
          <p className="py-12 text-center text-slate-500">
            {t("publicMenu.empty", "Menu is empty.")}
          </p>
        ) : (
          visibleCategories.map((category) => {
            const categoryItems = items.filter(
              (item) => item.category_id === category.id,
            );

            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="mb-12 scroll-mt-32"
              >
                <h2 className="mb-6 px-1 text-2xl font-bold tracking-tight text-slate-900">
                  {category.name}
                </h2>

                <div className="flex flex-col gap-3">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-colors hover:border-slate-200 sm:gap-4 md:p-5 ${
                        item.is_available ? "" : "grayscale opacity-70"
                      }`}
                    >
                      {item.image_url && (
                        <button
                          type="button"
                          onClick={() => setSelectedImage(item.image_url)}
                          className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100/50 bg-slate-100 shadow-sm sm:h-20 sm:w-20"
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      )}

                      <div className="flex-1 py-1 pr-2 sm:pr-4">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="text-base leading-tight font-bold text-slate-900">
                            {item.name}
                          </h3>
                          {!item.is_available && (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-slate-500">
                              {t("publicMenu.outOfStock", "Out of stock")}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-sm leading-relaxed text-slate-500">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5">
                        <span className="whitespace-nowrap text-sm font-bold tracking-tight text-slate-900 sm:text-base">
                          {currencySymbol}
                          {Number(item.price).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      <footer className="mt-16 pb-8 text-center">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
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
            aria-label={t("publicMenu.closeImage", "Close image preview")}
            className="absolute top-6 right-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={selectedImage}
            alt={t("publicMenu.imagePreviewAlt", "Full size preview")}
            className="max-h-full max-w-full rounded-[0.5rem] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
