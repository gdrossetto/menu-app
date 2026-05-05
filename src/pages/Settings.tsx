import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Save, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { supabase } from "../lib/supabase";
import { fetchRestaurantByOwner } from "../lib/menuData";
import { uploadMenuImage } from "../lib/imageUpload";
import type { Restaurant } from "../types/menu";

export default function Settings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();

  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [restaurantName, setRestaurantName] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRestaurant = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const data = await fetchRestaurantByOwner(session.user.id);

      if (data) {
        setRestaurant(data);
        setCurrencySymbol(data.currency_symbol || "$");
        setPrimaryColor(data.primary_color || "#000000");
        setRestaurantName(data.name || "");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRestaurant);
  }, [fetchRestaurant]);

  const uploadImage = async (rawFile: File): Promise<string | null> => {
    if (!restaurant) return null;
    const publicUrl = await uploadMenuImage(rawFile, restaurant.id, {
      maxWidth: 600,
      quality: 0.9,
      prefix: "logo",
    });

    if (!publicUrl) {
      alert("Failed to upload logo.");
    }

    return publicUrl;
  };

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;

    setSaving(true);

    let logoUrl = restaurant.logo_url;
    if (logoFile) {
      const uploadedUrl = await uploadImage(logoFile);
      if (uploadedUrl) logoUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: restaurantName,
        currency_symbol: currencySymbol,
        primary_color: primaryColor,
        logo_url: logoUrl,
      })
      .eq("id", restaurant.id);

    if (error) {
      alert("Error saving settings: " + error.message);
    } else {
      alert("Settings saved successfully!");
      setLogoFile(null);
      // Update local state
      setRestaurant({
        ...restaurant,
        name: restaurantName,
        currency_symbol: currencySymbol,
        primary_color: primaryColor,
        logo_url: logoUrl,
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingSpinner label="Loading settings" />
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout>
        <div style={{ textAlign: "center", marginTop: "4rem" }}>
          <h2>Please create a restaurant first in the Overview tab.</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "var(--color-primary)",
              letterSpacing: "-0.02em",
            }}
          >
            {t("settings.title", "Settings")}
          </h1>
          <p style={{ color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
            {t("settings.subtitle", "Configure your brand and localization.")}
          </p>
        </div>

        <div
          className="card"
          style={{
            border: "none",
            background: "var(--color-surface)",
            maxWidth: "600px",
          }}
        >
          <div className="card-body">
            <form onSubmit={saveSettings} className="flex flex-col gap-6">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t("settings.restaurantName", "Restaurant Name")}
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder={t(
                    "settings.restaurantNamePlaceholder",
                    "e.g. My Awesome Cafe",
                  )}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t("settings.restaurantLogo", "Restaurant Logo")}
                </label>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {t(
                    "settings.logoDescription",
                    "This logo will appear at the top of your public menu.",
                  )}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    marginTop: "0.5rem",
                  }}
                >
                  {logoFile || restaurant.logo_url ? (
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        flexShrink: 0,
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={
                          logoFile
                            ? URL.createObjectURL(logoFile)
                            : restaurant.logo_url!
                        }
                        alt="Logo Preview"
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  ) : null}
                  <div
                    className="form-input"
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} color="var(--color-text-muted)" />
                    <span
                      style={{
                        fontSize: "0.9rem",
                        color: logoFile
                          ? "var(--color-text)"
                          : "var(--color-text-muted)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {logoFile
                        ? logoFile.name
                        : restaurant.logo_url
                          ? t("editMenu.replaceImage", "Replace Image")
                          : t("editMenu.uploadImage", "Upload Image")}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setLogoFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t("settings.brandColor", "Brand Color")}
                </label>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {t(
                    "settings.brandColorDescription",
                    "Choose a primary color for your menu to match your brand.",
                  )}
                </p>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{
                      width: "50px",
                      height: "50px",
                      padding: 0,
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      backgroundColor: "transparent",
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "monospace",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {primaryColor.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">
                  {t("settings.currencySymbol", "Currency Symbol")}
                </label>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  {t(
                    "settings.currencyDescription",
                    "This symbol will be displayed next to prices on your public menu.",
                  )}
                </p>
                <select
                  className="form-input"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  style={{ maxWidth: "200px" }}
                >
                  <option value="$">$ (USD/CAD/AUD)</option>
                  <option value="R$">R$ (BRL)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="¥">¥ (JPY/CNY)</option>
                  <option value="₹">₹ (INR)</option>
                  <option value="Fr">Fr (CHF)</option>
                </select>
              </div>

              <div
                style={{
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? (
                    t("editMenu.saving", "Saving...")
                  ) : (
                    <>
                      <Save size={18} />{" "}
                      {t("settings.saveSettings", "Save Settings")}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
