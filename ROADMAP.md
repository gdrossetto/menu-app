# MenuQR Rápido: Path to Production

We have built a fantastic, blazing-fast MVP. The core value proposition—creating a beautiful digital menu quickly—is fully functional. However, to transition from an "MVP" to a secure, monetizable, and robust **B2B SaaS Product**, several critical areas must be addressed.

Here is a deep dive into what the product needs next, ordered by priority.

---

## 1. Security & Authentication (Critical Priority)
Currently, the app uses `localStorage` to remember the user's restaurant, and the database relies on wide-open Row Level Security (RLS) policies.

- **Supabase Auth Integration**: We need to implement proper user registration and login (Email/Password or Google OAuth).
- **Secure RLS Policies**: We must lock down the database. A user should only be able to edit, delete, or upload images for the `restaurant_id` tied to their authenticated `user_id`. Public users should only have `SELECT` (read) access.

## 2. Completing the Core Menu Experience (High Priority)
While the menu management is great, restaurant owners will immediately ask for these missing pieces:

- **Item Reordering**: We have drag-and-drop for Categories, but we need the exact same drag-and-drop functionality for **Menu Items** within those categories.
- **Item Availability Toggle**: The database already has an `is_available` boolean. We need a simple toggle switch in the UI so owners can mark items as "Out of Stock" without deleting them.
- **Currency Support**: The `$` symbol is hardcoded. We need a setting to allow owners to choose their local currency symbol (e.g., `R$`, `€`, `£`).

## 3. Brand Customization (Medium Priority)
Restaurants care deeply about their brand identity.

- **Logo Upload**: The database has a `logo_url` field, but no UI to upload it. Adding a logo to the public menu header adds massive perceived value.
- **Color Themes**: The database has a `primary_color` field. We should allow the owner to pick a theme color in the `/dashboard/settings` page, which dynamically changes the buttons and accents on their public menu.

## 4. Monetization & SaaS Infrastructure (Medium Priority)
If the goal is to charge a low monthly fee, the infrastructure needs to support it.

- **Stripe Integration**: Implement Stripe Checkout to handle subscriptions.
- **Usage Limits**: Enforce limits for free users (e.g., maximum of 15 items, no logo upload) to incentivize upgrading to a paid tier.

## 5. Analytics & Value Proof (Low Priority / Future)
To keep owners paying their subscription, you have to prove the product is working.

- **Scan Tracking**: Track how many times the public menu is viewed per day.
- **Simple Dashboard Chart**: Show the owner a simple bar chart of "Menu Views This Week".

## 6. Performance & SEO Polish (Ongoing)
- **Dynamic Meta Tags**: When someone shares the menu link on WhatsApp, it should show the restaurant's name and a nice preview image, not generic React boilerplate.
- **Image Optimization**: Ensure uploaded images are compressed so the public menu loads instantly even on slow 3G mobile connections.

---

### Summary Recommendation
The application feels premium, but it is currently insecure. **Phase 1** must be implementing real Authentication and locking down the Supabase RLS policies. Once secure, **Phase 2** should focus on adding the Logo Upload and Item Reordering to complete the user experience.
