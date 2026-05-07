# MenuQR - Project Overview

MenuQR is a B2B SaaS platform that allows restaurant owners to create and manage digital menus accessible via QR codes. It focuses on speed, modern aesthetics, and ease of use for both owners and customers.

## 🚀 Tech Stack
- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS v4 with shared semantic theme tokens in `src/index.css`
- **Backend/Database**: Supabase (PostgreSQL, Authentication, Storage, Edge Functions)
- **Icons**: Lucide React
- **Internationalization**: i18next, react-i18next (Supports English and Brazilian Portuguese)
- **AI Integration**: OpenAI Responses API via a Supabase Edge Function
- **Billing**: Stripe Checkout + Customer Portal + webhook-based subscription sync
- **Utilities**:
  - `@dnd-kit`: For drag-and-drop menu reordering
  - `qrcode.react`: For generating QR codes
  - `lucide-react`: For iconography

## 📂 Architecture & Directory Structure
- `src/pages/`: Core application views
  - `Dashboard.tsx`: Main owner overview, analytics, and QR code management.
  - `EditMenu.tsx`: Main menu management surface, including manual editing, drag-and-drop ordering, and AI-assisted imports.
  - `PublicMenu.tsx`: The customer-facing menu (mobile-optimized).
  - `Settings.tsx`: Restaurant branding (logo, colors, currency).
  - `PrintMenu.tsx`: Optimized view for physical printing.
  - `Login.tsx`: Authentication page.
- `src/components/`: Reusable UI components
  - `DashboardLayout.tsx`: Shared sidebar and navigation for the owner dashboard.
  - `SortableCategory.tsx` / `SortableMenuItem.tsx`: Drag-and-drop presentation for categories and items.
  - `MenuImportModal.tsx`: Review-and-confirm workflow for AI-generated menu imports.
  - `LoadingSpinner.tsx`: Shared loading state UI.
- `src/lib/`: Shared application helpers
  - `supabase.ts`: Typed Supabase client.
  - `menuData.ts`: Fetching and sorting helpers for restaurants, categories, and items.
  - `imageUpload.ts`: Shared image upload flow for restaurant/menu assets.
  - `menuImport.ts`: Client-side import orchestration and import-draft normalization.
  - `billing.ts`: Client-side billing helpers for checkout, portal redirects, and feature gating.
  - `imageOptimization.ts`: Browser-side image compression before upload.
- `src/types/`:
  - `supabase.ts`: Typed database schema used by the frontend client.
  - `menu.ts`: Shared domain types and import-draft types.
- `src/locales/`: Translation dictionaries (`en.json`, `pt.json`).
- `supabase/functions/menu-import/`: Supabase Edge Function that calls OpenAI to extract structured menu data from images or PDFs and enforces billing access.
- `supabase/functions/create-checkout-session/`: Creates a Stripe Checkout session for the Professional plan.
- `supabase/functions/create-billing-portal-session/`: Creates a Stripe Customer Portal session.
- `supabase/functions/stripe-webhook/`: Syncs Stripe subscription events back into Supabase.
- `supabase/functions/sync-billing-status/`: Manual/fallback billing sync from Stripe into Supabase.
- `supabase/functions/_shared/`: Shared CORS, auth, Supabase, and Stripe helpers for edge functions.
- `supabase_schema.sql`: The source of truth for the database structure.

## 📊 Database Schema
The database is hosted on Supabase and follows this structure:
- **`restaurants`**: Stores restaurant details (name, owner_id, logo_url, primary_color, currency_symbol) plus billing state (`plan_tier`, Stripe customer/subscription IDs, current subscription status, current period end).
- **`categories`**: Menu sections (e.g., "Starters", "Main Course"), linked to a restaurant.
- **`menu_items`**: Individual dishes/drinks, linked to a category. Includes price, description, and image_url.
- **`menu_views`**: Analytics table tracking every time a public menu is accessed.

## ✨ Key Features
1. **Multi-Tenant System**: Each user manages their own restaurant data isolated by Supabase Row Level Security (RLS).
2. **Instant QR Generation**: Owners get a unique QR code that they can download as PNG or print.
3. **Analytics Dashboard**: Real-time tracking of menu views with 7-day and 30-day insights.
4. **Internationalization (i18n)**: Automatic browser language detection with manual language switchers for both owners and customers.
5. **Image Optimization**: Automatic compression of uploaded menu item and logo images to ensure fast loading on mobile devices.
6. **AI Menu Import**: Owners can upload a photo or PDF of an existing menu, generate a structured draft, review it in a modal, edit category/item details, and only then import it into the app.
7. **Safe Import Review Flow**: Import never overwrites the menu blindly. It appends items into existing matching categories when possible, creates missing categories when needed, and supports empty-menu bootstrapping.
8. **Print Optimization**: A dedicated print view that removes web-only elements (tabs, buttons) and optimizes for ink/paper usage.
9. **Freemium Billing Model**: Core menu creation remains free. AI menu import is gated behind the Professional plan.

## 🤖 AI Import Workflow
The menu import pipeline is intentionally split into two steps:

1. **Extraction**:
   A Supabase Edge Function receives an image or PDF and sends it to the OpenAI Responses API.
2. **Review**:
   The frontend displays the extracted categories and items in a review modal where the owner can edit names, descriptions, and numeric-only prices before confirming.

Important behavior notes:
- Prices are normalized to numeric values only. Currency is displayed separately based on restaurant settings.
- The import flow is additive. It does not delete or reset existing menu data.
- If a restaurant already has categories/items, import adds into that existing structure.
- If a restaurant has no categories/items yet, import creates the necessary categories and items.
- The `menu-import` edge function checks the restaurant subscription before calling OpenAI, so the premium gate is enforced server-side and not only in the UI.

## 💳 Billing Workflow
The first paid feature is **AI menu import**.

Implementation shape:
1. **Checkout**
   - Authenticated owners start a Stripe Checkout subscription flow from the dashboard.
   - The checkout session is created server-side using a Stripe price lookup key.
2. **Webhook sync**
   - Stripe webhook events update the restaurant row in Supabase with plan tier and subscription status.
   - A fallback sync function can also pull the latest subscription directly from Stripe when webhook delivery is delayed.
3. **Portal**
   - Professional users can open the Stripe customer portal to manage payment methods or cancel their subscription.
4. **Feature gating**
   - The editor UI teases AI import on the free plan and redirects to checkout.
   - The edge function blocks direct AI import calls unless the subscription status is eligible (`active`, `trialing`, or `past_due`).

Recommended Stripe setup:
- One recurring product/price for the Professional plan
- A stable lookup key stored as `STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY` with current expected value `menuqr_pro`
- Stripe-hosted customer portal enabled in the Dashboard

## 🛠 Setup & Development
1. **Environment Variables**: Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Database Setup**: Run `supabase_schema.sql` in the Supabase SQL Editor.
3. **Storage**: Requires a public bucket named `menu-images` in Supabase Storage.
4. **Edge Function Secrets**:
   - `OPENAI_API_KEY`: Required by `supabase/functions/menu-import`.
   - `OPENAI_MENU_IMPORT_MODEL`: Optional model override. Defaults to `gpt-5.4-mini`.
   - `STRIPE_SECRET_KEY`: Required by the billing edge functions.
   - `STRIPE_WEBHOOK_SECRET`: Required by `supabase/functions/stripe-webhook`.
   - `STRIPE_AI_IMPORT_PRICE_LOOKUP_KEY`: Lookup key for the Professional Stripe price. Current expected value: `menuqr_pro`.
   - `SITE_URL`: Recommended fallback base URL for Stripe redirects when `Origin` is unavailable.
5. **Deploy Edge Function**:
   - `supabase functions deploy menu-import`
   - `supabase functions deploy create-checkout-session`
   - `supabase functions deploy create-billing-portal-session`
   - `supabase functions deploy stripe-webhook --no-verify-jwt`
   - `supabase functions deploy sync-billing-status`
6. **Commands**:
   - `npm install`: Install dependencies.
   - `npm run dev`: Start local development server.
   - `npm run lint`: Run code quality checks.
   - `npm run build`: Type-check and produce a production build.

## 🧭 Current UX Notes
- The menu editor supports two primary paths:
  - **Import an existing physical/digital menu**
  - **Continue editing manually / build from scratch**
- The import CTA is positioned near the category-creation workflow rather than hidden in the page header.
- Divider copy in the editor is contextual:
  - If the menu is empty, it suggests building from scratch.
  - If items already exist, it suggests continuing to edit manually.
- On the free plan, AI import remains visible in the editor as an upgrade path instead of disappearing.
- Billing management currently lives in the Settings screen rather than as a separate dashboard route.
- The Settings screen includes a manual **Sync billing now** action for Stripe fallback reconciliation.
