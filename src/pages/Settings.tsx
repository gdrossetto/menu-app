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
        <div className="app-empty-state">
          <h2>Please create a restaurant first in the Overview tab.</h2>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="app-page-title">
            {t("settings.title", "Settings")}
          </h1>
          <p className="app-page-subtitle">
            {t("settings.subtitle", "Configure your brand and localization.")}
          </p>
        </div>

        <div
          className="card max-w-[600px] border-none bg-app-surface"
        >
          <div className="card-body">
            <form onSubmit={saveSettings} className="flex flex-col gap-6">
              <div className="form-group">
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

              <div className="form-group">
                <label className="form-label">
                  {t("settings.restaurantLogo", "Restaurant Logo")}
                </label>
                <p className="app-help-text mb-2">
                  {t(
                    "settings.logoDescription",
                    "This logo will appear at the top of your public menu.",
                  )}
                </p>
                <div className="mt-2 flex items-center gap-4">
                  {logoFile || restaurant.logo_url ? (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.5rem] border border-app-border bg-white">
                      <img
                        src={
                          logoFile
                            ? URL.createObjectURL(logoFile)
                            : restaurant.logo_url!
                        }
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <div
                    className="app-upload-trigger flex-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={16} className="text-app-text-muted" />
                    <span className={`truncate text-[0.9rem] ${logoFile ? "text-app-text" : "text-app-text-muted"}`}>
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
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setLogoFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t("settings.brandColor", "Brand Color")}
                </label>
                <p className="app-help-text mb-2">
                  {t(
                    "settings.brandColorDescription",
                    "Choose a primary color for your menu to match your brand.",
                  )}
                </p>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-[50px] w-[50px] cursor-pointer rounded-[0.5rem] border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-app-text-muted">
                    {primaryColor.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t("settings.currencySymbol", "Currency Symbol")}
                </label>
                <p className="app-help-text mb-2">
                  {t(
                    "settings.currencyDescription",
                    "This symbol will be displayed next to prices on your public menu.",
                  )}
                </p>
                <select
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="form-input max-w-[200px]"
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

              <div className="border-t border-app-border pt-4">
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
