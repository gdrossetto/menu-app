import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { ExternalLink, Printer, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToast } from "../components/toastContext";
import { supabase } from "../lib/supabase";
import { fetchRestaurantByOwner } from "../lib/menuData";
import { logger } from "../lib/logger";
import type { Restaurant } from "../types/menu";

export default function Dashboard() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const { t } = useTranslation();
  const toast = useToast();

  const [timeframe, setTimeframe] = useState<"7" | "30">("7");
  const [chartData, setChartData] = useState<{ date: string; count: number }[]>(
    [],
  );

  const checkSession = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const data = await fetchRestaurantByOwner(session.user.id);

        if (data) {
          setRestaurant(data);
          localStorage.setItem("menuqr_restaurant_id", data.id);

          // Fetch views for analytics
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

          const { data: views, error: viewsError } = await supabase
            .from("menu_views")
            .select("viewed_at")
            .eq("restaurant_id", data.id)
            .gte("viewed_at", thirtyDaysAgo.toISOString());

          if (viewsError) {
            logger.error("Failed to load menu analytics.", viewsError, {
              restaurantId: data.id,
            });
          }

          if (views) {
            // Aggregate by day
            const counts: Record<string, number> = {};
            // Initialize last 30 days with 0
            for (let i = 29; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              counts[d.toISOString().split("T")[0]] = 0;
            }

            views.forEach((v) => {
              const dateStr = v.viewed_at.split("T")[0];
              if (counts[dateStr] !== undefined) counts[dateStr]++;
            });

            setChartData(
              Object.entries(counts).map(([date, count]) => ({ date, count })),
            );
          }
        } else {
          localStorage.removeItem("menuqr_restaurant_id");
        }
      }
    } catch (error) {
      logger.error("Failed to initialize dashboard.", error);
      toast.error(
        t("dashboard.loadError", "Could not load dashboard"),
        t("common.tryAgain", "Please try again. If it keeps failing, contact support."),
      );
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    void Promise.resolve().then(checkSession);
  }, [checkSession]);

  const createRestaurant = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRestaurantName.trim() || !userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .insert([{ name: newRestaurantName }]) // owner_id is set by default to auth.uid() in the database schema
      .select()
      .single();

    if (data) {
      localStorage.setItem("menuqr_restaurant_id", data.id);
      setRestaurant(data);
      toast.success(
        t("dashboard.restaurantCreated", "Restaurant created"),
        t(
          "dashboard.restaurantCreatedDescription",
          "Your dashboard is ready. You can start adding menu items now.",
        ),
      );
    } else {
      logger.error("Failed to create restaurant.", error, {
        userId,
        restaurantName: newRestaurantName,
      });
      toast.error(
        t("dashboard.createRestaurantError", "Could not create restaurant"),
        error?.message ??
          t("common.tryAgain", "Please try again. If it keeps failing, contact support."),
      );
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  if (!restaurant) {
    return (
      <div className="app-screen-center">
        <div className="app-empty-card animate-fade-in">
          <h1 className="mb-2 text-center text-2xl font-bold tracking-[-0.02em]">
            {t("dashboard.welcome", "Welcome to MenuQR")}
          </h1>
          <p className="mb-8 text-center text-[0.95rem] text-app-text-muted">
            {t(
              "dashboard.enterRestaurantName",
              "Enter your restaurant's name to get started.",
            )}
          </p>

          <form onSubmit={createRestaurant} className="form-group gap-4">
            <input
              id="name"
              type="text"
              className="form-input"
              value={newRestaurantName}
              onChange={(e) => setNewRestaurantName(e.target.value)}
              placeholder="e.g. Mario's Pizza"
              required
            />
            <button
              type="submit"
              className="btn btn-primary w-full py-3"
            >
              {t("dashboard.createMenuBtn", "Create My Menu")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/m/${restaurant.id}`;
  const filteredChartData = timeframe === "7" ? chartData.slice(-7) : chartData;

  const downloadQRCode = () => {
    const canvas = document.getElementById("qr-canvas") as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL("image/png")
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `menu-qr-${restaurant.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } else {
      logger.error("QR canvas was not available for download.", undefined, {
        restaurantId: restaurant.id,
      });
      toast.error(
        t("dashboard.qrDownloadError", "Could not save QR code"),
        t("common.tryAgain", "Please try again. If it keeps failing, contact support."),
      );
    }
  };

  const totalViews = filteredChartData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <DashboardLayout>
      <div className="app-section-stack animate-fade-in">
        <div>
          <h1 className="app-page-title">
            {t("dashboard.overview", "Overview")}
          </h1>
          <p className="app-page-subtitle">
            {t("dashboard.manageMenu", "Manage your digital menu and QR code.")}
          </p>
        </div>

        <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          <div
            className="card flex flex-col items-center border-none bg-app-surface px-8 py-12"
          >
            <div className="mb-8 rounded-[1.5rem] bg-white p-4 shadow-app-md">
              <QRCodeCanvas
                id="qr-canvas"
                value={publicUrl}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
            <h2 className="mb-2 text-xl font-semibold">
              {t("dashboard.yourQrCode", "Your QR Code")}
            </h2>
            <p className="mb-8 text-center text-[0.9rem] text-app-text-muted">
              {t(
                "dashboard.customersCanScan",
                "Customers can scan this to view your menu instantly.",
              )}
            </p>
            <div className="flex w-full flex-wrap justify-center gap-2">
              <button
                className="btn btn-primary min-w-[100px] flex-1 py-3"
                onClick={downloadQRCode}
              >
                <Download size={18} /> {t("dashboard.save", "Save")}
              </button>
              <button
                className="btn btn-outline min-w-[100px] flex-1 py-3"
                onClick={() => {
                  window.open(`/m/${restaurant.id}/print`, "_blank");
                }}
              >
                <Printer size={18} /> {t("dashboard.print", "Print")}
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline min-w-[100px] flex-1 py-3"
              >
                <ExternalLink size={18} /> {t("dashboard.open", "Open")}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="card border-none bg-app-surface">
              <div className="card-body">
                <div className="mb-6 flex items-center justify-between">
                  <h3 className="m-0 text-[1.1rem] font-semibold">
                    {t("dashboard.menuViews", "Menu Views")}
                  </h3>
                  <select
                    aria-label={t("dashboard.analyticsTimeframe", "Analytics timeframe")}
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value as "7" | "30")}
                    className="app-inline-select bg-white"
                  >
                    <option value="7">
                      {t("dashboard.last7Days", "Last 7 Days")}
                    </option>
                    <option value="30">
                      {t("dashboard.last30Days", "Last 30 Days")}
                    </option>
                  </select>
                </div>

                <div className="flex h-[150px] items-end gap-1 border-b border-app-border pb-2">
                  {filteredChartData.length === 0 || totalViews === 0 ? (
                    <div className="flex h-full w-full items-center justify-center text-[0.9rem] text-app-text-muted">
                      {t(
                        "dashboard.noViewsYet",
                        "No views yet. Share your link!",
                      )}
                    </div>
                  ) : (
                    filteredChartData.map((d, i) => {
                      const maxCount = Math.max(
                        ...filteredChartData.map((c) => c.count),
                        1,
                      );
                      const barHeight = d.count > 0
                        ? Math.max((d.count / maxCount) * 100, 4)
                        : 0;
                      return (
                        <div
                          key={i}
                          className="flex h-full flex-1 flex-col items-center gap-2"
                        >
                          <div className="relative flex w-full flex-1 items-end justify-center">
                            <svg
                              viewBox="0 0 30 100"
                              preserveAspectRatio="none"
                              role="img"
                              aria-label={`${d.count} views on ${d.date}`}
                              className={`opacity-80 ${
                                timeframe === "30"
                                  ? "h-full w-full max-w-[30px]"
                                  : "h-full w-5 max-w-[30px]"
                              }`}
                            >
                              <rect
                                x="0"
                                y={100 - barHeight}
                                width="30"
                                height={barHeight}
                                rx="4"
                                ry="4"
                                className="fill-app-primary"
                              />
                            </svg>
                          </div>
                          <span
                            className={`text-[0.6rem] text-app-text-muted ${
                              timeframe === "30" && i % 5 !== 0 ? "hidden" : "block"
                            }`}
                          >
                            {d.date.split("-")[2]}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="mt-4 text-center text-[1.2rem] font-semibold text-app-primary">
                  {totalViews}{" "}
                  <span className="text-[0.9rem] font-normal text-app-text-muted">
                    {t("dashboard.totalViews", "total views")}
                  </span>
                </div>
              </div>
            </div>

            <div className="card border-none bg-app-surface">
              <div className="card-body">
                <h3 className="mb-2 text-[1.1rem] font-semibold">
                  {t("dashboard.quickActions", "Quick Actions")}
                </h3>
                <p className="mb-6 text-[0.9rem] text-app-text-muted">
                  {t(
                    "dashboard.updateCategories",
                    "Update your categories and items. Changes are saved automatically.",
                  )}
                </p>
                <Link
                  to="/dashboard/menu"
                  className="btn btn-primary w-full"
                >
                  {t("dashboard.editMenuItems", "Edit Menu Items")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
