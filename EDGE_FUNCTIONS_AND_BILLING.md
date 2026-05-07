# Edge Functions and Billing Guide

This document is the source of truth for MenuQR's backend function setup, Stripe billing integration, environment secrets, deployment steps, and troubleshooting.

It is written for the current codebase in this repository.

## High-Level Architecture

MenuQR currently uses **five** Supabase Edge Functions:

1. `menu-import`
2. `create-checkout-session`
3. `create-billing-portal-session`
4. `stripe-webhook`
5. `sync-billing-status`

The current premium model is:

- **Free plan**: core menu editing features
- **Professional plan**: unlocks AI menu import

Billing state is stored on the `restaurants` table, not in a separate billing table.

## Database Fields Used by Billing

The `restaurants` table must include these columns:

- `plan_tier text not null default 'free'`
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_price_id text`
- `subscription_status text`
- `subscription_current_period_end timestamptz`

Current intended values:

- `plan_tier`
  - `free`
  - `pro`
- `subscription_status`
  - values come from Stripe subscription statuses such as `active`, `trialing`, `past_due`, `canceled`, `incomplete`, `unpaid`

Access to AI import is currently granted when:

- `plan_tier = 'pro'`
- and `subscription_status` is one of:
  - `active`
  - `trialing`
  - `past_due`

## Edge Functions Overview

### 1. `menu-import`

Path:
- [supabase/functions/menu-import/index.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/menu-import/index.ts)

Purpose:
- Accepts a menu photo or PDF
- Verifies the caller is authenticated
- Loads the caller's restaurant
- Verifies the restaurant has AI import entitlement
- Sends the file to OpenAI Responses API
- Returns structured JSON for the review modal

Auth:
- Protected
- `verify_jwt` should remain enabled

Request body:

```json
{
  "fileName": "menu.pdf",
  "mimeType": "application/pdf",
  "fileData": "base64..."
}
```

Important behavior:
- Prices are requested as numeric strings only
- Currency symbols are intentionally excluded
- If billing does not allow AI import, the function returns `403`

Required secrets:
- `OPENAI_API_KEY`
- `OPENAI_MENU_IMPORT_MODEL` (optional, defaults to `gpt-5.4-mini`)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 2. `create-checkout-session`

Path:
- [supabase/functions/create-checkout-session/index.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/create-checkout-session/index.ts)

Purpose:
- Starts a Stripe Checkout session for the Professional subscription

Auth:
- Protected
- `verify_jwt` should remain enabled

What it does:
- Verifies authenticated user
- Loads that user's restaurant
- If the restaurant already has AI import access, returns early
- Reads the Stripe price using the configured lookup key
- Creates a Stripe customer if one does not already exist
- Persists `stripe_customer_id` back to the restaurant row
- Creates a Stripe Checkout session in `subscription` mode

Current Stripe price config used by code:
- `STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY`

Current expected request body:

```json
{
  "successPath": "/dashboard/settings?billing=success",
  "cancelPath": "/dashboard/settings?billing=cancel"
}
```

Important note:
- The code currently uses a **Stripe price lookup key**, not a direct `price_...` ID.
- The lookup key you configured during setup is currently expected to be:

```txt
menuqr_pro
```

Required secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY`
- `SITE_URL` (fallback base URL when `Origin` is missing)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. `create-billing-portal-session`

Path:
- [supabase/functions/create-billing-portal-session/index.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/create-billing-portal-session/index.ts)

Purpose:
- Opens the Stripe Customer Portal for a restaurant owner

Auth:
- Protected
- `verify_jwt` should remain enabled

What it does:
- Verifies authenticated user
- Loads the restaurant
- Requires `stripe_customer_id` to exist
- Creates a Stripe billing portal session

Request body:

```json
{
  "returnPath": "/dashboard/settings"
}
```

Required secrets:
- `STRIPE_SECRET_KEY`
- `SITE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### 4. `stripe-webhook`

Path:
- [supabase/functions/stripe-webhook/index.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/stripe-webhook/index.ts)

Purpose:
- Receives Stripe webhook events
- Syncs subscription state back into the restaurant row

Auth:
- Public webhook endpoint
- Must be deployed with `--no-verify-jwt`

What it handles:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

What it updates:
- `plan_tier`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `subscription_status`
- `subscription_current_period_end`

Required secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Important operational note:
- If Stripe Checkout succeeds but the app stays on the free plan, the first thing to check is whether this function is actually being hit by Stripe.

### 5. `sync-billing-status`

Path:
- [supabase/functions/sync-billing-status/index.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/sync-billing-status/index.ts)

Purpose:
- Manual/fallback sync from Stripe into Supabase
- Used when checkout succeeded but webhook delivery has not updated the restaurant row yet

Auth:
- Protected
- `verify_jwt` should remain enabled

What it does:
- Verifies authenticated user
- Loads the restaurant
- If a Stripe customer exists, fetches that customer's subscriptions from Stripe
- Chooses the primary subscription using internal priority rules
- Syncs it to the restaurant row

Used by:
- automatic refresh after `?billing=success`
- manual "Sync billing now" button in Settings

Required secrets:
- `STRIPE_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Shared Edge Function Helpers

Shared files live in:
- [supabase/functions/_shared/cors.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/_shared/cors.ts)
- [supabase/functions/_shared/supabase.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/_shared/supabase.ts)
- [supabase/functions/_shared/billing.ts](/Users/gabrielrossetto/Documents/development/menu-app/supabase/functions/_shared/billing.ts)

### `cors.ts`
- Shared CORS headers
- JSON response helper

### `supabase.ts`
- `createUserClient(request)`
- `createAdminClient()`
- `requireAuthenticatedUser(request)`

### `billing.ts`
- `getStripeClient()`
- `getRestaurantForOwner(ownerId)`
- `syncRestaurantSubscription(...)`
- `hasAiImportEntitlement(...)`
- `stringifyId(...)`
- `pickPrimarySubscription(...)`

## Stripe Setup

## Stripe Product and Price

Create one recurring product for the paid plan.

Recommended shape:
- Product name: `MenuQR Professional`
- Billing period: monthly
- Currency: your preferred production currency

Current code expects a **price lookup key** secret:

```txt
STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY=menuqr_pro
```

If you keep the current code, the Stripe price must actually have:

```txt
lookup_key = menuqr_pro
```

## Stripe Keys

You need:

- Publishable key: `pk_...`
  - used by Stripe frontend integrations if added later
  - not used directly in the current client app
- Secret key: `sk_...`
  - required by billing edge functions
- Webhook secret: `whsec_...`
  - required by `stripe-webhook`

Important:
- `sk_...` and `whsec_...` are different values

## Stripe Customer Portal

In Stripe Dashboard:

1. Go to Billing / Customer Portal
2. Enable the portal
3. Allow at least:
   - payment method updates
   - subscription cancellation
   - invoice visibility

## Stripe Webhook Events

The webhook endpoint should subscribe to exactly these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Optional future additions:
- `invoice.payment_failed`
- `invoice.paid`

Current code does not require those optional invoice events.

## Supabase Secrets

Set these in:
- Supabase Dashboard
- Project Settings
- Edge Functions
- Secrets

### OpenAI secrets

```txt
OPENAI_API_KEY=...
OPENAI_MENU_IMPORT_MODEL=gpt-5.4-mini
```

### Stripe secrets

```txt
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY=menuqr_pro
SITE_URL=https://your-production-domain.com
```

### Supabase runtime secrets

These are typically available automatically in Edge Functions, but the code depends on them:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Deployment Commands

Deploy protected functions:

```bash
supabase functions deploy menu-import
supabase functions deploy create-checkout-session
supabase functions deploy create-billing-portal-session
supabase functions deploy sync-billing-status
```

Deploy webhook function:

```bash
supabase functions deploy stripe-webhook --no-verify-jwt
```

## Local Function Development

You can serve functions locally with the Supabase CLI.

Example:

```bash
supabase functions serve menu-import --env-file ./supabase/.env.local
```

You can do the same for billing functions:

```bash
supabase functions serve create-checkout-session --env-file ./supabase/.env.local
supabase functions serve create-billing-portal-session --env-file ./supabase/.env.local
supabase functions serve stripe-webhook --env-file ./supabase/.env.local
supabase functions serve sync-billing-status --env-file ./supabase/.env.local
```

Suggested local `supabase/.env.local` values:

```txt
OPENAI_API_KEY=...
OPENAI_MENU_IMPORT_MODEL=gpt-5.4-mini
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY=menuqr_pro
SITE_URL=http://localhost:5175
```

If you test Stripe webhooks locally, use Stripe's local listener tooling and point it at your local function URL.

## Stripe Webhook Endpoint URL

Current Supabase project ref:

```txt
peahyguxlsjzvgcohcni
```

Current webhook endpoint:

```txt
https://peahyguxlsjzvgcohcni.supabase.co/functions/v1/stripe-webhook
```

## Where to Inspect Live State

### In Supabase

Check the `restaurants` row for the owner:

- `plan_tier`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `subscription_status`
- `subscription_current_period_end`

If checkout created a Stripe customer but billing is not unlocked, this table is the first place to look.

### In Stripe

Check:
- Customer
- Subscription
- Payment
- Webhook deliveries

If Stripe shows a successful subscription but Supabase still says `free`, the problem is in sync, not in checkout.

## Setup Checklist

Use this exact order.

1. Run the Supabase schema changes so `restaurants` includes billing columns.
2. Create the Stripe product and recurring price.
3. Make sure the Stripe price has lookup key:
   - `menuqr_pro`
4. Add all required Supabase Edge Function secrets.
5. Deploy all five edge functions.
6. Create the Stripe webhook endpoint pointing to Supabase.
7. Subscribe the endpoint to the four required events.
8. Copy the Stripe signing secret into `STRIPE_WEBHOOK_SECRET`.
9. Test checkout in Stripe test mode using test card data.
10. Verify the restaurant row updates to `plan_tier = 'pro'`.

## Testing Cards

In Stripe sandbox/test mode, use test cards only.

Example:

```txt
4242 4242 4242 4242
```

Use:
- any future expiry date
- any 3-digit CVC
- any ZIP/postal code

Do not use a real card in test mode.

## Current App-Side Billing UX

### Settings page

Path:
- [src/pages/Settings.tsx](/Users/gabrielrossetto/Documents/development/menu-app/src/pages/Settings.tsx)

Behavior:
- shows current plan badge
- shows AI import entitlement state
- offers:
  - upgrade button on free plan
  - manage billing button on paid plan
  - manual **Sync billing now** button

### Edit Menu page

Path:
- [src/pages/EditMenu.tsx](/Users/gabrielrossetto/Documents/development/menu-app/src/pages/EditMenu.tsx)

Behavior:
- free plan sees AI import teaser and upgrade CTA
- paid plan can open the import modal
- after checkout success return, the page attempts a fallback sync automatically

## Troubleshooting

## Problem: checkout returns 500

Most likely causes:
- `STRIPE_SECRET_KEY` missing or invalid
- `STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY` missing
- Stripe price does not actually have lookup key `menuqr_pro`
- `restaurants` table is missing billing columns
- no restaurant row exists for the current user

## Problem: checkout succeeds but the app stays on free

Most likely causes:
- Stripe webhook endpoint was not created
- webhook events were not selected correctly
- `STRIPE_WEBHOOK_SECRET` is missing or wrong
- `stripe-webhook` was not deployed with `--no-verify-jwt`

Fallback:
- use **Sync billing now** in Settings
- this calls `sync-billing-status` and pulls the current Stripe subscription manually

Additional diagnosis:
- If Supabase shows `stripe_customer_id` but `stripe_subscription_id` is `null`, checkout likely worked and sync did not.
- If Supabase edge logs show no `stripe-webhook` invocations, Stripe is not successfully delivering to the webhook endpoint.

## Problem: `stripe_customer_id` exists but `stripe_subscription_id` is null

Meaning:
- checkout created the Stripe customer
- but subscription sync never reached Supabase

What to check:
- Stripe webhook delivery logs
- whether Stripe actually created a subscription
- whether `stripe-webhook` has any invocation logs in Supabase

## Problem: multiple active subscriptions exist

This happened during test flow already once.

Meaning:
- checkout was completed multiple times
- billing sync fallback can still pick a primary subscription

Recommended cleanup:
- cancel duplicate test subscriptions in Stripe Dashboard

## Problem: AI import still returns 403 after payment

Check:
- `restaurants.plan_tier`
- `restaurants.subscription_status`
- whether the app synced billing after checkout
- whether the webhook updated the restaurant row

AI import requires:

```txt
plan_tier = pro
subscription_status in (active, trialing, past_due)
```

## Current Known Implementation Notes

1. The billing model is currently tied to the `restaurants` row, not a separate subscription table.
2. The code currently uses a **Stripe lookup key** secret, not a direct `price_...` ID.
3. `sync-billing-status` exists specifically as a resilience layer when webhook delivery is late or misconfigured.
4. The webhook path is still the preferred long-term sync path.
5. There is no usage-based billing yet. This is a fixed-price recurring subscription.

## Recommended Future Improvements

1. Switch from lookup key to direct `STRIPE_AI_IMPORT_PRICE_ID` if Stripe dashboard setup becomes annoying again.
2. Add `invoice.payment_failed` handling for better customer messaging.
3. Add a dedicated billing status panel on the dashboard overview.
4. Add internal admin logging around Stripe event payloads for easier support/debugging.
5. Add a deduplication or "already subscribed" guard on the frontend before repeated Checkout attempts.
