import Stripe from "npm:stripe@18.5.0";
import { createAdminClient } from "./supabase.ts";

const PREMIUM_STATUSES = new Set(["active", "trialing", "past_due"]);

export function getStripeClient() {
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  return new Stripe(stripeSecretKey);
}

export async function getRestaurantForOwner(ownerId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  if (error || !data) {
    throw new Error("Restaurant not found.");
  }

  return data;
}

export async function syncRestaurantSubscription(
  input:
    | {
        restaurantId: string;
        subscription: Stripe.Subscription;
        customerId?: string | null;
      }
    | {
        restaurantId: string;
        canceledSubscriptionId: string;
        customerId?: string | null;
      },
) {
  const supabase = createAdminClient();

  if ("subscription" in input) {
    const { subscription, customerId, restaurantId } = input;
    const firstItem = subscription.items.data[0];
    const isPro = PREMIUM_STATUSES.has(subscription.status);

    const { error } = await supabase
      .from("restaurants")
      .update({
        plan_tier: isPro ? "pro" : "free",
        stripe_customer_id: customerId ?? stringifyId(subscription.customer),
        stripe_subscription_id: subscription.id,
        stripe_price_id: firstItem?.price?.id ?? null,
        subscription_status: subscription.status,
        subscription_current_period_end: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null,
      })
      .eq("id", restaurantId);

    if (error) {
      throw error;
    }

    return;
  }

  let query = supabase
    .from("restaurants")
    .update({
      plan_tier: "free",
      stripe_customer_id: input.customerId ?? null,
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_status: "canceled",
      subscription_current_period_end: null,
    })
    .eq("id", input.restaurantId);

  if (input.canceledSubscriptionId) {
    query = query.eq("stripe_subscription_id", input.canceledSubscriptionId);
  }

  const { error } = await query;

  if (error) {
    throw error;
  }
}

export function hasAiImportEntitlement(restaurant: {
  plan_tier?: string | null;
  subscription_status?: string | null;
}) {
  return (
    restaurant.plan_tier === "pro" &&
    PREMIUM_STATUSES.has(restaurant.subscription_status ?? "")
  );
}

export function stringifyId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function pickPrimarySubscription(subscriptions: Stripe.Subscription[]) {
  const statusPriority = new Map<string, number>([
    ["active", 0],
    ["trialing", 1],
    ["past_due", 2],
    ["incomplete", 3],
    ["unpaid", 4],
    ["canceled", 5],
    ["incomplete_expired", 6],
  ]);

  return [...subscriptions].sort((left, right) => {
    const leftPriority = statusPriority.get(left.status) ?? 99;
    const rightPriority = statusPriority.get(right.status) ?? 99;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return right.created - left.created;
  })[0] ?? null;
}
