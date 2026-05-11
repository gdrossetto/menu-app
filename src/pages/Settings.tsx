import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowRight,
  CreditCard,
  Eye,
  Palette,
  Save,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToast } from "../components/toastContext";
import {
  getPlanLabel,
  hasAiImportAccess,
  openBillingPortal,
  startAiImportCheckout,
  syncBillingStatus,
} from "../lib/billing";
import { supabase } from "../lib/supabase";
import { fetchRestaurantByOwner } from "../lib/menuData";
import { uploadMenuImage } from "../lib/imageUpload";
import { getErrorMessage, logger } from "../lib/logger";
import type { MenuTheme, Restaurant } from "../types/menu";

const menuThemeOptions: Array<{ value: MenuTheme; labelKey: string; fallback: string }> = [
  { value: "minimalist", labelKey: "settings.menuThemeMinimalist", fallback: "Minimalist" },
  { value: "classic", labelKey: "settings.menuThemeClassic", fallback: "Classic Fine Dining" },
  { value: "dark", labelKey: "settings.menuThemeDark", fallback: "Dark & Bold" },
  { value: "visual", labelKey: "settings.menuThemeVisual", fallback: "Visual Grid" },
];

export default function Settings() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const { t } = useTranslation();
  const toast = useToast();
  const location = useLocation();

  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [primaryColor, setPrimaryColor] = useState("#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [menuTheme, setMenuTheme] = useState<MenuTheme>("minimalist");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const logoPreviewUrl = useMemo(() => {
    if (logoFile) {
      return URL.createObjectURL(logoFile);
    }

    return restaurant?.logo_url ?? null;
  }, [logoFile, restaurant?.logo_url]);

  useEffect(() => {
    if (!logoFile || !logoPreviewUrl) return;

    return () => URL.revokeObjectURL(logoPreviewUrl);
  }, [logoFile, logoPreviewUrl]);

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
        setMenuTheme((data.menu_theme as MenuTheme | null) || "minimalist");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(fetchRestaurant);
  }, [fetchRestaurant]);

  useEffect(() => {
    if (!restaurant || !location.search.includes("billing=success")) return;
    if (hasAiImportAccess(restaurant)) return;
    if (!restaurant.stripe_customer_id) return;

    let active = true;

    void (async () => {
      try {
        setBillingLoading(true);
        await syncBillingStatus();
        if (active) {
          await fetchRestaurant();
        }
      } catch (error) {
        logger.error("Failed to sync billing after checkout redirect.", error, {
          restaurantId: restaurant.id,
          stripeCustomerId: restaurant.stripe_customer_id,
        });
      } finally {
        if (active) {
          setBillingLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [fetchRestaurant, location.search, restaurant]);

  const uploadImage = async (rawFile: File): Promise<string | null> => {
    if (!restaurant) return null;
    const publicUrl = await uploadMenuImage(rawFile, restaurant.id, {
      maxWidth: 600,
      quality: 0.9,
      prefix: "logo",
    });

    if (!publicUrl) {
      logger.error("Logo upload returned no public URL.", undefined, {
        restaurantId: restaurant.id,
        fileName: rawFile.name,
        fileType: rawFile.type,
        fileSize: rawFile.size,
      });
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
      if (!uploadedUrl) {
        toast.error(
          t("settings.logoUploadError", "Logo upload failed"),
          t(
            "settings.logoUploadErrorDescription",
            "Your settings were not saved. Please try another image or check your storage setup.",
          ),
        );
        setSaving(false);
        return;
      }
      logoUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("restaurants")
      .update({
        name: restaurantName,
        currency_symbol: currencySymbol,
        primary_color: primaryColor,
        logo_url: logoUrl,
        menu_theme: menuTheme,
      })
      .eq("id", restaurant.id);

    if (error) {
      logger.error("Failed to save restaurant settings.", error, {
        restaurantId: restaurant.id,
        menuTheme,
      });
      toast.error(
        t("settings.saveError", "Settings were not saved"),
        error.message,
      );
    } else {
      toast.success(
        t("settings.saveSuccess", "Settings saved"),
        t(
          "settings.saveSuccessDescription",
          "Your public menu settings are up to date.",
        ),
      );
      setLogoFile(null);
      // Update local state
      setRestaurant({
        ...restaurant,
        name: restaurantName,
        currency_symbol: currencySymbol,
        primary_color: primaryColor,
        logo_url: logoUrl,
        menu_theme: menuTheme,
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
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Store size={32} />
          </div>
          <h2 className="mb-2 text-2xl font-bold text-slate-900">
            {t("settings.noRestaurant", "No Restaurant Found")}
          </h2>
          <p className="max-w-md text-slate-500 mb-8">
            {t("settings.noRestaurantDesc", "Please create a restaurant first in the Dashboard before managing your settings.")}
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            {t("settings.goToDashboard", "Go to Dashboard")}
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const menuPreviewUrl = `/m/${restaurant.id}?previewTheme=${menuTheme}`;

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
                  {logoPreviewUrl ? (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[0.5rem] border border-app-border bg-white">
                      <img
                        src={logoPreviewUrl}
                        alt={t("settings.logoPreviewAlt", "Logo preview")}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  ) : null}
                  <button
                    type="button"
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
                  </button>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    aria-label={t("settings.restaurantLogo", "Restaurant Logo")}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setLogoFile(e.target.files[0]);
                      }
                    }}
                  />
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

              <div className="form-group">
                <label className="form-label">
                  {t("settings.menuTheme", "Menu Layout")}
                </label>
                <p className="app-help-text mb-2">
                  {t(
                    "settings.menuThemeDescription",
                    "Choose the template used on your public menu. Preview it before saving if you want to compare layouts.",
                  )}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="relative flex-1">
                    <Palette className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-app-text-muted" />
                    <select
                      aria-label={t("settings.menuTheme", "Menu Layout")}
                      value={menuTheme}
                      onChange={(e) => setMenuTheme(e.target.value as MenuTheme)}
                      className="form-input w-full pl-10"
                    >
                      {menuThemeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.labelKey, option.fallback)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline w-full sm:w-auto"
                    onClick={() => {
                      window.open(menuPreviewUrl, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    {t("settings.visualizer", "Open visualizer")}
                  </button>
                </div>
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

        <div className="card mt-8 max-w-[600px] border-none bg-white">
          <div className="card-body flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-app-surface-hover px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.05em] text-app-primary">
                  <CreditCard className="h-3.5 w-3.5" />
                  {t("settings.billingBadge", "Billing")}
                </div>
                <h2 className="text-[1.2rem] font-semibold text-app-text">
                  {t("settings.billingTitle", "Plan & billing")}
                </h2>
                <p className="mt-1 max-w-[480px] text-[0.94rem] text-app-text-muted">
                  {hasAiImportAccess(restaurant)
                    ? t(
                        "settings.billingSubtitlePro",
                        "Your restaurant can use AI menu import and manage its subscription from here.",
                      )
                    : t(
                        "settings.billingSubtitleFree",
                        "Upgrade when you want to unlock AI menu import. Everything else in the menu builder stays free.",
                      )}
                </p>
              </div>

              <span className="rounded-full bg-app-surface-hover px-3 py-1.5 text-[0.8rem] font-semibold uppercase tracking-[0.05em] text-app-text">
                {getPlanLabel(restaurant) === "pro"
                  ? t("settings.planPro", "Professional")
                  : t("settings.planFree", "Free")}
              </span>
            </div>

            {location.search.includes("billing=success") && (
              <div className="rounded-[0.75rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[0.92rem] text-emerald-800">
                {t(
                  "settings.billingSuccess",
                  "Your checkout finished. If your plan does not update immediately, refresh in a few seconds.",
                )}
              </div>
            )}

            {location.search.includes("billing=cancel") && (
              <div className="rounded-[0.75rem] border border-app-border bg-app-bg px-4 py-3 text-[0.92rem] text-app-text-muted">
                {t(
                  "settings.billingCanceled",
                  "Checkout was canceled. Your current plan has not changed.",
                )}
              </div>
            )}

            <div className="rounded-[1rem] border border-app-border bg-app-bg px-5 py-5">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[0.95rem] font-medium text-app-text">
                  <Sparkles className="h-4 w-4" />
                  {t(
                    "settings.aiImportFeature",
                    "AI menu import",
                  )}
                </div>
                <p className="text-[0.92rem] text-app-text-muted">
                  {hasAiImportAccess(restaurant)
                    ? t(
                        "settings.aiImportFeatureEnabled",
                        "Included in your current plan. Upload a photo or PDF and review the import before publishing.",
                      )
                    : t(
                        "settings.aiImportFeatureLocked",
                        "Locked on the Free plan. Upgrade to Professional to import photos and PDFs with AI.",
                      )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="btn btn-outline"
                disabled={billingLoading}
                onClick={async () => {
                  try {
                    setBillingLoading(true);
                    await syncBillingStatus();
                    await fetchRestaurant();
                    toast.success(
                      t("settings.billingSyncSuccess", "Billing synced"),
                      t(
                        "settings.billingSyncSuccessDescription",
                        "Your plan status has been refreshed.",
                      ),
                    );
                  } catch (error) {
                    const message = getErrorMessage(
                      error,
                      t(
                        "settings.billingSyncError",
                        "We could not sync your billing status right now.",
                      ),
                    );
                    logger.error("Manual billing sync failed.", error, {
                      restaurantId: restaurant.id,
                      stripeCustomerId: restaurant.stripe_customer_id,
                    });
                    toast.error(t("settings.billingSyncFailed", "Billing sync failed"), message);
                  } finally {
                    setBillingLoading(false);
                  }
                }}
              >
                <Sparkles className="h-4 w-4" />
                {billingLoading
                  ? t("settings.syncingBilling", "Syncing billing...")
                  : t("settings.syncBilling", "Sync billing now")}
              </button>

              {hasAiImportAccess(restaurant) ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={billingLoading}
                  onClick={async () => {
                    try {
                      setBillingLoading(true);
                      await openBillingPortal("/dashboard/settings");
                    } catch (error) {
                      const message = getErrorMessage(
                        error,
                        t(
                          "settings.billingPortalError",
                          "We could not open the billing portal right now.",
                        ),
                      );
                      logger.error("Failed to open billing portal.", error, {
                        restaurantId: restaurant.id,
                        stripeCustomerId: restaurant.stripe_customer_id,
                      });
                      toast.error(t("settings.billingPortalFailed", "Could not open billing"), message);
                    } finally {
                      setBillingLoading(false);
                    }
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  {t("settings.manageBilling", "Manage billing")}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={billingLoading}
                  onClick={async () => {
                    try {
                      setBillingLoading(true);
                      await startAiImportCheckout("/dashboard/settings");
                    } catch (error) {
                      const message = getErrorMessage(
                        error,
                        t(
                          "settings.billingCheckoutError",
                          "We could not start checkout right now.",
                        ),
                      );
                      logger.error("Failed to start checkout from settings.", error, {
                        restaurantId: restaurant.id,
                        planTier: restaurant.plan_tier,
                      });
                      toast.error(t("settings.billingCheckoutFailed", "Could not start checkout"), message);
                    } finally {
                      setBillingLoading(false);
                    }
                  }}
                >
                  <ArrowRight className="h-4 w-4" />
                  {t("settings.upgradePlan", "Upgrade to Professional")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
