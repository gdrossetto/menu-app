import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { getRestaurantForOwner, getStripeClient } from "../_shared/billing.ts";
import { requireAuthenticatedUser } from "../_shared/supabase.ts";
import { getSafeErrorResponse, logFunctionError } from "../_shared/logging.ts";

interface PortalRequestBody {
  returnPath?: string;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const user = await requireAuthenticatedUser(request);
    const restaurant = await getRestaurantForOwner(user.id);

    if (!restaurant.stripe_customer_id) {
      return jsonResponse(
        { error: "No Stripe customer was found for this restaurant yet." },
        400,
      );
    }

    const body = (await request.json().catch(() => ({}))) as PortalRequestBody;
    const returnUrl = new URL(
      normalizeAppPath(body.returnPath, "/dashboard/settings"),
      request.headers.get("origin") || Deno.env.get("SITE_URL") || "http://localhost:5173",
    ).toString();

    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: restaurant.stripe_customer_id,
      return_url: returnUrl,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    logFunctionError("create-billing-portal-session", error);
    const { status, message } = getSafeErrorResponse(
      error,
      "Unable to create billing portal session.",
    );
    return jsonResponse({ error: message }, status);
  }
});

function normalizeAppPath(path: string | undefined, fallback: string) {
  if (!path || !path.startsWith("/")) {
    return fallback;
  }

  return path;
}
