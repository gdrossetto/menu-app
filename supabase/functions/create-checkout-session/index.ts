import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  getRestaurantForOwner,
  getStripeClient,
  hasAiImportEntitlement,
} from "../_shared/billing.ts";
import { createAdminClient, requireAuthenticatedUser } from "../_shared/supabase.ts";

interface CheckoutRequestBody {
  successPath?: string;
  cancelPath?: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const restaurant = await getRestaurantForOwner(user.id);

    if (hasAiImportEntitlement(restaurant)) {
      return jsonResponse({
        alreadySubscribed: true,
        message: "AI import is already unlocked for this restaurant.",
      });
    }

    const stripe = getStripeClient();
    const stripePriceLookupKey = Deno.env.get("STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY");
    if (!stripePriceLookupKey) {
      throw new Error("Missing STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY environment variable.");
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutRequestBody;
    const siteUrl = getSiteUrl(request);
    const successUrl = new URL(
      normalizeAppPath(body.successPath, "/dashboard/settings?billing=success"),
      siteUrl,
    ).toString();
    const cancelUrl = new URL(
      normalizeAppPath(body.cancelPath, "/dashboard/settings?billing=cancel"),
      siteUrl,
    ).toString();

    const prices = await stripe.prices.list({
      lookup_keys: [stripePriceLookupKey],
      active: true,
      limit: 1,
    });

    const price = prices.data[0];
    if (!price) {
      throw new Error("No active Stripe price found for the configured lookup key.");
    }

    const customerId = await getOrCreateCustomerId(stripe, restaurant, user.email);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: restaurant.id,
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        restaurant_id: restaurant.id,
        owner_id: user.id,
        feature: "ai_import",
      },
      subscription_data: {
        metadata: {
          restaurant_id: restaurant.id,
          owner_id: user.id,
          feature: "ai_import",
        },
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create checkout session.";
    const status = message === "Unauthorized." ? 401 : 500;
    return jsonResponse({ error: message }, status);
  }
});

async function getOrCreateCustomerId(
  stripe: ReturnType<typeof getStripeClient>,
  restaurant: Awaited<ReturnType<typeof getRestaurantForOwner>>,
  email: string | undefined,
) {
  if (restaurant.stripe_customer_id) {
    return restaurant.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email,
    name: restaurant.name,
    metadata: {
      restaurant_id: restaurant.id,
      owner_id: restaurant.owner_id,
    },
  });

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ stripe_customer_id: customer.id })
    .eq("id", restaurant.id);

  if (error) {
    throw error;
  }

  return customer.id;
}

function getSiteUrl(request: Request) {
  return request.headers.get("origin") || Deno.env.get("SITE_URL") || "http://localhost:5173";
}

function normalizeAppPath(path: string | undefined, fallback: string) {
  if (!path || !path.startsWith("/")) {
    return fallback;
  }

  return path;
}
