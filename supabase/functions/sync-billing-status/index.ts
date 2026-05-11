import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  getRestaurantForOwner,
  getStripeClient,
  pickPrimarySubscription,
  syncRestaurantSubscription,
} from "../_shared/billing.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";
import { getSafeErrorResponse, logFunctionError } from "../_shared/logging.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const restaurant = await getRestaurantForOwner(user.id);

    if (!restaurant.stripe_customer_id) {
      return jsonResponse({
        synced: false,
        reason: "missing_customer",
      });
    }

    const stripe = getStripeClient();
    const subscriptions = await stripe.subscriptions.list({
      customer: restaurant.stripe_customer_id,
      status: "all",
      limit: 20,
    });

    const primarySubscription = pickPrimarySubscription(subscriptions.data);

    if (!primarySubscription) {
      await syncRestaurantSubscription({
        restaurantId: restaurant.id,
        canceledSubscriptionId: restaurant.stripe_subscription_id ?? "",
        customerId: restaurant.stripe_customer_id,
      });

      return jsonResponse({
        synced: true,
        plan_tier: "free",
        subscription_status: "canceled",
      });
    }

    await syncRestaurantSubscription({
      restaurantId: restaurant.id,
      subscription: primarySubscription,
      customerId: restaurant.stripe_customer_id,
    });

    return jsonResponse({
      synced: true,
      plan_tier: ["active", "trialing", "past_due"].includes(primarySubscription.status)
        ? "pro"
        : "free",
      subscription_status: primarySubscription.status,
      stripe_subscription_id: primarySubscription.id,
    });
  } catch (error) {
    logFunctionError("sync-billing-status", error);
    const { status, message } = getSafeErrorResponse(
      error,
      "Unable to sync billing status.",
    );
    return jsonResponse({ error: message }, status);
  }
});
