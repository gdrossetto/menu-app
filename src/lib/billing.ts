import { supabase } from "./supabase";
import type { Restaurant } from "../types/menu";

const AI_IMPORT_ENABLED_STATUSES = new Set(["active", "trialing", "past_due"]);

export function hasAiImportAccess(restaurant: Restaurant | null) {
  if (!restaurant) return false;

  return (
    restaurant.plan_tier === "pro" &&
    AI_IMPORT_ENABLED_STATUSES.has(restaurant.subscription_status ?? "")
  );
}

export function getPlanLabel(restaurant: Restaurant | null) {
  return restaurant?.plan_tier === "pro" ? "pro" : "free";
}

export async function startAiImportCheckout(returnPath = "/dashboard/settings") {
  const { data, error } = await supabase.functions.invoke(
    "create-checkout-session",
    {
      body: {
        successPath: `${returnPath}?billing=success`,
        cancelPath: `${returnPath}?billing=cancel`,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to start checkout.");
  }

  const checkoutUrl = data?.url;
  if (typeof checkoutUrl !== "string" || !checkoutUrl) {
    throw new Error("Stripe checkout URL is missing.");
  }

  window.location.assign(checkoutUrl);
}

export async function openBillingPortal(returnPath = "/dashboard/settings") {
  const { data, error } = await supabase.functions.invoke(
    "create-billing-portal-session",
    {
      body: {
        returnPath,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Unable to open billing portal.");
  }

  const portalUrl = data?.url;
  if (typeof portalUrl !== "string" || !portalUrl) {
    throw new Error("Stripe billing portal URL is missing.");
  }

  window.location.assign(portalUrl);
}

export async function syncBillingStatus() {
  const { data, error } = await supabase.functions.invoke("sync-billing-status");

  if (error) {
    throw new Error(error.message || "Unable to sync billing status.");
  }

  return data;
}
