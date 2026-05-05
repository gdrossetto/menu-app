# MenuQR - Project Overview

MenuQR is a B2B SaaS platform that allows restaurant owners to create and manage digital menus accessible via QR codes. It focuses on speed, modern aesthetics, and ease of use for both owners and customers.

## 🚀 Tech Stack
- **Frontend**: React 19, Vite, TypeScript
- **Styling**: Vanilla CSS (Modern CSS variables, Flexbox/Grid)
- **Backend/Database**: Supabase (PostgreSQL, Authentication, Storage)
- **Icons**: Lucide React
- **Internationalization**: i18next, react-i18next (Supports English and Brazilian Portuguese)
- **Utilities**: 
  - `@dnd-kit`: For drag-and-drop menu reordering
  - `qrcode.react`: For generating QR codes
  - `lucide-react`: For iconography

## 📂 Architecture & Directory Structure
- `src/pages/`: Core application views
  - `Dashboard.tsx`: Main owner overview, analytics, and QR code management.
  - `EditMenu.tsx`: Drag-and-drop interface for managing categories and items.
  - `PublicMenu.tsx`: The customer-facing menu (mobile-optimized).
  - `Settings.tsx`: Restaurant branding (logo, colors, currency).
  - `PrintMenu.tsx`: Optimized view for physical printing.
  - `Login.tsx`: Authentication page.
- `src/components/`: Reusable UI components
  - `DashboardLayout.tsx`: Shared sidebar and navigation for the owner dashboard.
  - `SortableCategory.tsx` / `SortableMenuItem.tsx`: Extracted logic for the menu builder.
- `src/lib/`: Service configurations (Supabase client, i18n setup).
- `src/locales/`: Translation dictionaries (`en.json`, `pt.json`).
- `supabase_schema.sql`: The source of truth for the database structure.

## 📊 Database Schema
The database is hosted on Supabase and follows this structure:
- **`restaurants`**: Stores restaurant details (name, owner_id, logo_url, primary_color, currency_symbol).
- **`categories`**: Menu sections (e.g., "Starters", "Main Course"), linked to a restaurant.
- **`menu_items`**: Individual dishes/drinks, linked to a category. Includes price, description, and image_url.
- **`menu_views`**: Analytics table tracking every time a public menu is accessed.

## ✨ Key Features
1. **Multi-Tenant System**: Each user manages their own restaurant data isolated by Supabase Row Level Security (RLS).
2. **Instant QR Generation**: Owners get a unique QR code that they can download as PNG or print.
3. **Analytics Dashboard**: Real-time tracking of menu views with 7-day and 30-day insights.
4. **Internationalization (i18n)**: Automatic browser language detection with manual language switchers for both owners and customers.
5. **Image Optimization**: Automatic compression of uploaded menu item and logo images to ensure fast loading on mobile devices.
6. **Print Optimization**: A dedicated print view that removes web-only elements (tabs, buttons) and optimizes for ink/paper usage.

## 🛠 Setup & Development
1. **Environment Variables**: Requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Database Setup**: Run `supabase_schema.sql` in the Supabase SQL Editor.
3. **Storage**: Requires a public bucket named `menu-images` in Supabase Storage.
4. **Commands**:
   - `npm install`: Install dependencies.
   - `npm run dev`: Start local development server.
   - `npm run lint`: Run code quality checks.
