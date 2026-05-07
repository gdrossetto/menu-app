# MenuQR Product Roadmap

This roadmap reflects the current state of the app after:
- Tailwind styling migration
- AI menu import rollout
- Landing page rollout
- Stripe billing setup for a freemium model

## ✅ Phase 1: Security and Core Mechanics (Completed)

- Supabase authentication
- Row Level Security (RLS)
- Restaurant ownership model
- Category and item CRUD

## ✅ Phase 2: Core Menu Experience (Completed)

- Drag and drop for categories and items
- Availability toggles
- Client-side image compression
- Public mobile menu
- Print menu
- QR code generation
- Restaurant branding
- Analytics with 7/30 day views
- English and Portuguese support

## ✅ Phase 3: Differentiator Features (Completed / In Progress)

- AI menu import from photo/PDF
- Review-before-import modal
- Additive import into existing categories
- Empty-menu bootstrapping
- Landing page with product marketing

## ✅ Phase 4: Monetization Foundations (Completed)

- Stripe Checkout subscription flow
- Stripe Customer Portal integration
- Stripe webhook sync into Supabase
- Fallback manual billing sync
- Freemium model where AI import is the first paid feature

Current monetization shape:

- **Free**
  - core editor
  - QR code
  - public menu
  - print menu
  - settings and branding
- **Professional**
  - AI menu import

## 🚀 Phase 5: Billing Hardening and SaaS Ops (Next)

### 1. Webhook reliability and observability

- Add richer logging around Stripe webhook payload handling
- Add admin/support visibility for billing state mismatches
- Add deduplication safeguards for repeated checkout attempts

### 2. Billing UX polish

- Add a dedicated billing status section to the dashboard overview
- Show subscription renewal/cancellation dates more explicitly
- Add clearer success/failure messaging around sync states

### 3. Entitlement expansion

Potential future paid features:
- Advanced analytics
- Additional theme packs
- AI translation
- Team access / multi-user restaurants
- Custom domain or white-label options

## 🌱 Phase 6: Product Expansion Ideas

### Dietary and allergen badges

- Vegan
- Gluten-free
- Spicy
- Contains nuts

### Featured items / chef specials

- Highlighted dishes
- Optional "popular picks" section

### Translation workflows

- Manual translations
- AI-assisted translations
- Owner-controlled override flow

### Restaurant operations features

- Temporary specials
- Scheduled availability
- Happy hour menus
- Seasonal menus

## Technical Debt / Maintenance

- Split large frontend bundle with route-level code splitting
- Add database migration files instead of relying only on the schema snapshot
- Improve webhook testability and local Stripe dev workflow
- Consider moving from Stripe lookup key to direct price ID if dashboard setup remains confusing
