import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@18.5.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import {
  getStripeClient,
  stringifyId,
  syncRestaurantSubscription,
} from "../_shared/billing.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const signature = request.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      throw new Error("Missing Stripe webhook configuration.");
    }

    const stripe = getStripeClient();
    const body = await request.text();
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
    );

    await handleStripeEvent(stripe, event);

    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook error.";
    return jsonResponse({ error: message }, 400);
  }
});

async function handleStripeEvent(
  stripe: ReturnType<typeof getStripeClient>,
  event: Stripe.Event,
) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) {
        return;
      }

      const subscription = await stripe.subscriptions.retrieve(
        stringifyId(session.subscription)!,
      );
      const restaurantId =
        session.metadata?.restaurant_id ||
        subscription.metadata.restaurant_id ||
        session.client_reference_id;

      if (!restaurantId) {
        throw new Error("Missing restaurant metadata on completed checkout session.");
      }

      await syncRestaurantSubscription({
        restaurantId,
        subscription,
        customerId: stringifyId(session.customer),
      });
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const restaurantId = subscription.metadata.restaurant_id;

      if (!restaurantId) {
        return;
      }

      await syncRestaurantSubscription({
        restaurantId,
        subscription,
        customerId: stringifyId(subscription.customer),
      });
      return;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const restaurantId = subscription.metadata.restaurant_id;

      if (!restaurantId) {
        return;
      }

      await syncRestaurantSubscription({
        restaurantId,
        canceledSubscriptionId: subscription.id,
        customerId: stringifyId(subscription.customer),
      });
      return;
    }

    default:
      return;
  }
}
