import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
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

  // Smooth scroll to category
  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 140; // offset for sticky header
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  // Update active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      const offsets = categories.map((c) => {
        const el = document.getElementById(`category-${c.id}`);
        return {
          id: c.id,
          top: el ? el.getBoundingClientRect().top : Infinity,
        };
      });

      const current = offsets.filter((o) => o.top <= 160).pop();
      if (current && current.id !== activeCategory) {
        setActiveCategory(current.id);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories, activeCategory]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !restaurant) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2>{error || "Menu not found"}</h2>
      </div>
    );
  }

  return (
    <div
      style={
        {
          backgroundColor: "var(--color-bg)",
          minHeight: "100vh",
          paddingBottom: "4rem",
          ...(restaurant.primary_color && restaurant.primary_color !== "#000000"
            ? { "--color-primary": restaurant.primary_color }
            : {}),
        } as CSSProperties
      }
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          padding: "2.5rem 1.5rem 1rem",
          textAlign: "center",
          position: "sticky",
          top: 0,
          zIndex: 10,
          boxShadow: "0 1px 0 rgba(0,0,0,0.03)",
        }}
      >
        {/* Language Switcher */}
        <div style={{ position: "absolute", top: "1rem", right: "1.5rem" }}>
          <select
            value={i18n.language.split("-")[0]}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.8rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-border)",
              background: "white",
              cursor: "pointer",
            }}
          >
            <option value="en">EN</option>
            <option value="pt">PT</option>
          </select>
        </div>

        {restaurant.logo_url && (
          <img
            src={restaurant.logo_url}
            alt={restaurant.name}
            style={{
              height: "60px",
              margin: "0 auto 1rem",
              borderRadius: "var(--radius-sm)",
            }}
          />
        )}
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--color-primary)",
            letterSpacing: "-0.02em",
            margin: 0,
          }}
        >
          {restaurant.name}
        </h1>

        {/* Horizontal scrollable categories */}
        {categories.length > 0 && (
          <div
            style={{
              display: "flex",
              overflowX: "auto",
              gap: "0.5rem",
              marginTop: "1.5rem",
              paddingBottom: "0.5rem",
              scrollbarWidth: "none", // Firefox
              msOverflowStyle: "none", // IE and Edge
            }}
            className="hide-scrollbar"
          >
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                style={{
                  padding: "0.5rem 1.25rem",
                  borderRadius: "var(--radius-full)",
                  whiteSpace: "nowrap",
                  fontWeight: 500,
                  fontSize: "0.9rem",
                  backgroundColor:
                    activeCategory === cat.id
                      ? "var(--color-primary)"
                      : "var(--color-surface-hover)",
                  color:
                    activeCategory === cat.id
                      ? "white"
                      : "var(--color-text-muted)",
                  border: "none",
                  transition: "all var(--transition-fast)",
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu Content */}
      <main
        style={{ padding: "2rem 1.5rem", maxWidth: "600px", margin: "0 auto" }}
      >
        {categories.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--color-text-muted)" }}>
            Menu is empty.
          </p>
        ) : (
          categories.map((category) => {
            const catItems = items.filter((i) => i.category_id === category.id);
            if (catItems.length === 0) return null;

            return (
              <section
                key={category.id}
                id={`category-${category.id}`}
                style={{ marginBottom: "3.5rem", scrollMarginTop: "160px" }}
              >
                <h2
                  style={{
                    fontSize: "1.4rem",
                    fontWeight: 600,
                    marginBottom: "1.5rem",
                    color: "var(--color-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {category.name}
                </h2>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className="card"
                      style={{
                        display: "flex",
                        overflow: "hidden",
                        border: "none",
                        boxShadow: "var(--shadow-sm)",
                        backgroundColor: "var(--color-surface)",
                        filter: item.is_available ? "none" : "grayscale(100%)",
                        opacity: item.is_available ? 1 : 0.7,
                      }}
                    >
                      <div style={{ flex: 1, padding: "1.25rem" }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "1rem",
                          }}
                        >
                          <h3
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: 600,
                              margin: 0,
                              color: "var(--color-primary)",
                            }}
                          >
                            {item.name}
                            {!item.is_available && (
                              <span
                                style={{
                                  display: "inline-flex",
                                  marginLeft: "0.5rem",
                                  fontSize: "0.7rem",
                                  backgroundColor: "var(--color-border)",
                                  padding: "0.2rem 0.4rem",
                                  borderRadius: "var(--radius-sm)",
                                  color: "var(--color-surface)",
                                  fontWeight: 600,
                                  verticalAlign: "middle",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                }}
                              >
                                Out of Stock
                              </span>
                            )}
                          </h3>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--color-text)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {restaurant.currency_symbol || "$"}
                            {item.price.toFixed(2)}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            style={{
                              marginTop: "0.5rem",
                              fontSize: "0.9rem",
                              color: "var(--color-text-muted)",
                              lineHeight: 1.5,
                            }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.image_url && (
                        <div
                          style={{
                            width: "120px",
                            flexShrink: 0,
                            padding: "0.75rem",
                            paddingLeft: 0,
                            cursor: "pointer",
                          }}
                          onClick={() => setSelectedImage(item.image_url)}
                        >
                          <img
                            src={item.image_url}
                            alt={item.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "var(--radius-sm)",
                            }}
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

      <footer
        style={{
          textAlign: "center",
          padding: "3rem 1.5rem",
          color: "var(--color-border)",
          fontSize: "0.85rem",
        }}
      >
        <p style={{ color: "var(--color-text-muted)" }}>
          {t("publicMenu.poweredBy", "Powered by MenuQR")}
        </p>
      </footer>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "1.5rem",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <img
            src={selectedImage}
            alt="Full size preview"
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: "var(--radius-sm)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
