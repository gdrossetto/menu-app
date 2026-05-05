import { useEffect, useState, useRef } from "react";
import { Save, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../components/DashboardLayout";
import { supabase } from "../lib/supabase";
import type { Database } from "../types/supabase";

type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];

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

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", session.user.id)
        .limit(1)
        .single();

      if (data) {
        setRestaurant(data);
        setCurrencySymbol((data as any).currency_symbol || "$");
        setPrimaryColor(data.primary_color || "#000000");
        setRestaurantName(data.name || "");
      }
    }
    setLoading(false);
  };

  const uploadImage = async (rawFile: File): Promise<string | null> => {
    if (!restaurant) return null;

    // Compress logo (max 600px width for logo)
    const { compressImage } = await import("../lib/imageOptimization");
    const file = await compressImage(rawFile, 600, 0.9);

    const fileExt = file.name.split(".").pop();
    const fileName = `logo_${restaurant.id}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${restaurant.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("menu-images")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      alert("Failed to upload logo.");
      return null;
    }

    const { data } = supabase.storage
      .from("menu-images")
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const saveSettings = async (e: React.FormEvent) => {
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
        primary_color: primaryColor,
        logo_url: logoUrl,
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div
          style={{ display: "flex", justifyContent: "center", padding: "4rem" }}
        >
          <div
            className="spinner"
            style={{
              width: "30px",
              height: "30px",
              border: "2px solid var(--color-border)",
              borderTopColor: "var(--color-primary)",
              borderRadius: "50%",
            }}
          ></div>
        </div>
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
