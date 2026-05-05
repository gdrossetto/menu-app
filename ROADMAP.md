# MenuQR Product Roadmap

## ✅ Phase 1: Security & Core Mechanics (Completed)

- **Supabase Authentication**: Secure login system.
- **Row Level Security (RLS)**: Enforced data ownership (users can only see/edit their own restaurant).
- **Core CRUD**: Categories and Items management.

## ✅ Phase 2: The Core Menu Experience (Completed)

- **Drag & Drop**: Category and Item reordering.
- **Availability Toggles**: Mark items "Out of Stock" without deleting them.
- **Image Compression**: Client-side native canvas compression for lightning-fast uploads.
- **Printable Menu**: Auto-generated ink-friendly A4 physical menu.
- **Analytics**: Real-time view tracking with dynamic 7/30 day bar charts.
- **Brand Customization**: Logo uploads and dynamic CSS color theming.

---

# 🚀 Phase 3: The "Killer Features" (Differentiators)

To make restaurant owners choose MenuQR over free PDF generators or established competitors, we need features that actively increase their sales or reduce their staff's workload.

## 1. Dietary & Allergen Badges (High Priority - Easy Win)

Customers increasingly base dining decisions on dietary restrictions.

- **Feature**: Add checkboxes in the Edit Item modal for: 🌿 Vegan, 🌾 Gluten-Free, 🌶️ Spicy, 🥜 Contains Nuts.
- **UI Impact**: Display small, elegant emoji/SVG badges next to the item names on the public menu.

## 2. "Featured" or "Chef's Special" Items (High Priority - Revenue Driver)

Restaurants want to push high-margin items.

- **Feature**: A toggle to mark an item as "Featured".
- **UI Impact**: Featured items get a special visual treatment (e.g., a subtle border, a star icon) or are aggregated into a "Popular Picks" horizontal scrolling carousel at the very top of the menu.

## 3. Multi-Language / AI Translation (Low Priority / Future)

Essential for tourist-heavy areas.

- **Feature**: Allow the user to select a language dropdown on the public menu.
- **Execution**: Use an API (like Google Translate or OpenAI) to auto-translate the menu on the fly, or allow the owner to manually input translations.

---

## 🔒 Phase 4: Monetization & SaaS Infrastructure

Once we have a "Killer Feature" built (like Badges or Featured Items), it's time to charge for it.

- **Stripe Integration**: Implement Stripe Checkout.
- **Freemium Model**:
  - _Free Tier_: Max 15 items, standard theme, no analytics.
  - _Pro Tier ($15/mo)_: Unlimited items, logo upload, analytics, printable menu, featured items, and waiter requests.
