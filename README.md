# MenuQR

MenuQR is a SaaS app for restaurant owners to create, manage, and publish QR-code-based digital menus. The core editor is free. The first premium feature is **AI menu import**, which is billed through Stripe.

## Stack
- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- Supabase (Auth, Postgres, Storage, Edge Functions)
- Stripe Billing
- OpenAI Responses API

## Main Product Surfaces
- Owner dashboard: QR code, analytics, quick actions
- Menu editor: categories, items, drag-and-drop ordering, AI import
- Settings: branding, currency, billing
- Public menu: mobile-first restaurant menu
- Print menu: printer-friendly layout
- Landing page: marketing site on `/`

## Freemium Model
- **Free**
  - core menu editor
  - QR code
  - public menu
  - print menu
  - branding and currency settings
- **Professional**
  - AI menu import from photo/PDF

## Important Docs
- Product and architecture overview: [PROJECT_OVERVIEW.md](/Users/gabrielrossetto/Documents/development/menu-app/PROJECT_OVERVIEW.md)
- Full Edge Function + Stripe setup guide: [EDGE_FUNCTIONS_AND_BILLING.md](/Users/gabrielrossetto/Documents/development/menu-app/EDGE_FUNCTIONS_AND_BILLING.md)
- Product roadmap: [ROADMAP.md](/Users/gabrielrossetto/Documents/development/menu-app/ROADMAP.md)

## Local Development
Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Quality checks:

```bash
npm run lint
npm run build
```

## Required Frontend Environment Variables
Create a Vite env file with:

```txt
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Backend Requirements
- Supabase project with the schema in `supabase_schema.sql`
- Public storage bucket named `menu-images`
- Edge Function secrets for OpenAI and Stripe
- Stripe Checkout + Customer Portal + webhook endpoint configured

For the full backend and billing setup, use [EDGE_FUNCTIONS_AND_BILLING.md](/Users/gabrielrossetto/Documents/development/menu-app/EDGE_FUNCTIONS_AND_BILLING.md).
