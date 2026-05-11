import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";

const SUPABASE_ORIGIN = "https://peahyguxlsjzvgcohcni.supabase.co";
const AUTH_STORAGE_KEY = "sb-peahyguxlsjzvgcohcni-auth-token";

type RestaurantPlan = "free" | "pro";

interface MockOptions {
  plan?: RestaurantPlan;
}

const user = {
  id: "user-1",
  aud: "authenticated",
  role: "authenticated",
  email: "owner@example.com",
  app_metadata: {},
  user_metadata: {},
};

function createRestaurant(plan: RestaurantPlan = "pro") {
  return {
    id: "restaurant-1",
    created_at: "2026-05-01T00:00:00.000Z",
    owner_id: user.id,
    name: "Rossetto",
    logo_url: null,
    primary_color: "#000000",
    currency_symbol: "R$",
    menu_theme: "minimalist",
    plan_tier: plan,
    stripe_customer_id: plan === "pro" ? "cus_test" : null,
    stripe_subscription_id: plan === "pro" ? "sub_test" : null,
    stripe_price_id: plan === "pro" ? "price_test" : null,
    subscription_status: plan === "pro" ? "active" : null,
    subscription_current_period_end: plan === "pro" ? "2026-06-07T20:43:20.000Z" : null,
  };
}

function createCategories() {
  return [
    {
      id: "cat-starters",
      created_at: "2026-05-01T00:00:00.000Z",
      restaurant_id: "restaurant-1",
      name: "Starters",
      order_index: 0,
    },
    {
      id: "cat-mains",
      created_at: "2026-05-01T00:00:00.000Z",
      restaurant_id: "restaurant-1",
      name: "Main Course",
      order_index: 1,
    },
  ];
}

function createItems() {
  return [
    {
      id: "item-mozzarella",
      created_at: "2026-05-01T00:00:00.000Z",
      category_id: "cat-starters",
      name: "Mozzarella Sticks",
      description: "Served with marinara sauce.",
      price: 7.99,
      image_url: null,
      is_available: true,
      order_index: 0,
    },
    {
      id: "item-salmon",
      created_at: "2026-05-01T00:00:00.000Z",
      category_id: "cat-mains",
      name: "Grilled Salmon",
      description: "Served with roasted asparagus.",
      price: 24.99,
      image_url: null,
      is_available: true,
      order_index: 0,
    },
  ];
}

async function mockMenuQrApi(page: Page, options: MockOptions = {}) {
  const context = page.context();
  const state = {
    restaurant: createRestaurant(options.plan ?? "pro"),
    categories: createCategories(),
    items: createItems(),
  };
  const accessToken = createTestJwt();

  await context.addInitScript(
    ({ key, authUser, token }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          access_token: token,
          refresh_token: "test-refresh-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          token_type: "bearer",
          user: authUser,
        }),
      );
      window.localStorage.setItem("menuqr_restaurant_id", "restaurant-1");
    },
    { key: AUTH_STORAGE_KEY, authUser: user, token: accessToken },
  );

  await context.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (method === "OPTIONS") {
      await fulfill(route, {});
      return;
    }

    if (url.pathname.startsWith("/auth/v1/user")) {
      await fulfill(route, user);
      return;
    }

    if (url.pathname.startsWith("/functions/v1/create-checkout-session")) {
      await fulfill(route, { url: "http://127.0.0.1:5177/checkout-smoke" });
      return;
    }

    if (url.pathname.startsWith("/functions/v1/sync-billing-status")) {
      state.restaurant = {
        ...state.restaurant,
        plan_tier: "pro",
        stripe_customer_id: "cus_test",
        stripe_subscription_id: "sub_test",
        stripe_price_id: "price_test",
        subscription_status: "active",
        subscription_current_period_end: "2026-06-07T20:43:20.000Z",
      };
      await fulfill(route, {
        synced: true,
        plan_tier: "pro",
        subscription_status: "active",
        stripe_subscription_id: "sub_test",
      });
      return;
    }

    if (url.pathname.startsWith("/functions/v1/create-billing-portal-session")) {
      await fulfill(route, { url: "http://127.0.0.1:5177/billing-portal-smoke" });
      return;
    }

    if (url.pathname.startsWith("/functions/v1/menu-import")) {
      await fulfill(route, {
        sourceFileName: "menu.png",
        detectedLanguage: "en",
        warnings: [],
        categories: [
          {
            name: "Imported Specials",
            items: [
              {
                name: "Garlic Bread",
                description: "Toasted bread with garlic butter.",
                price: "6.50",
              },
            ],
          },
        ],
      });
      return;
    }

    if (url.pathname.startsWith("/rest/v1/restaurants")) {
      if (method === "GET") {
        await fulfill(route, state.restaurant);
        return;
      }

      if (method === "PATCH") {
        const body = readJsonBody<Record<string, unknown>>(request.postData());
        state.restaurant = { ...state.restaurant, ...body };
        await fulfill(route, state.restaurant);
        return;
      }

      if (method === "POST") {
        await fulfill(route, state.restaurant);
        return;
      }
    }

    if (url.pathname.startsWith("/rest/v1/categories")) {
      if (method === "GET") {
        await fulfill(route, state.categories);
        return;
      }

      if (method === "POST") {
        const body = readJsonBody<Partial<(typeof state.categories)[number]>[] | Partial<(typeof state.categories)[number]>>(request.postData());
        const nextCategoryInput = Array.isArray(body) ? body[0] : body;
        const nextCategory = {
          id: nextCategoryInput.id ?? `cat-${state.categories.length + 1}`,
          created_at: "2026-05-01T00:00:00.000Z",
          restaurant_id: "restaurant-1",
          name: nextCategoryInput.name ?? "New Category",
          order_index: nextCategoryInput.order_index ?? state.categories.length,
        };

        if (request.headers()["prefer"]?.includes("resolution=merge-duplicates")) {
          state.categories = Array.isArray(body)
            ? body.map((category, index) => ({
                id: category.id ?? `cat-${index + 1}`,
                created_at: category.created_at ?? "2026-05-01T00:00:00.000Z",
                restaurant_id: category.restaurant_id ?? "restaurant-1",
                name: category.name ?? "Category",
                order_index: category.order_index ?? index,
              }))
            : state.categories;
          await fulfill(route, state.categories);
          return;
        }

        state.categories.push(nextCategory);
        await fulfill(route, nextCategory);
        return;
      }

      if (method === "DELETE") {
        await fulfill(route, {});
        return;
      }
    }

    if (url.pathname.startsWith("/rest/v1/menu_items")) {
      if (method === "GET") {
        await fulfill(route, state.items);
        return;
      }

      if (method === "POST") {
        const body = readJsonBody<Partial<(typeof state.items)[number]>[] | Partial<(typeof state.items)[number]>>(request.postData());
        const itemInputs = Array.isArray(body) ? body : [body];
        const nextItems = itemInputs.map((item, index) => ({
          id: item.id ?? `item-${state.items.length + index + 1}`,
          created_at: item.created_at ?? "2026-05-01T00:00:00.000Z",
          category_id: item.category_id ?? "cat-starters",
          name: item.name ?? "New Item",
          description: item.description ?? null,
          price: Number(item.price ?? 0),
          image_url: item.image_url ?? null,
          is_available: item.is_available ?? true,
          order_index: item.order_index ?? state.items.length + index,
        }));

        if (request.headers()["prefer"]?.includes("resolution=merge-duplicates")) {
          state.items = state.items.map(
            (existing) => nextItems.find((item) => item.id === existing.id) ?? existing,
          );
          await fulfill(route, nextItems);
          return;
        }

        state.items.push(...nextItems);

        const expectsSingleObject = request
          .headers()
          .accept?.includes("application/vnd.pgrst.object+json");

        await fulfill(route, expectsSingleObject ? nextItems[0] : nextItems);
        return;
      }

      if (method === "PATCH") {
        const body = readJsonBody<Partial<(typeof state.items)[number]>>(request.postData());
        const updated = { ...state.items[0], ...body };
        state.items[0] = updated;
        await fulfill(route, updated);
        return;
      }

      if (method === "DELETE") {
        await fulfill(route, {});
        return;
      }
    }

    if (url.pathname.startsWith("/rest/v1/menu_views")) {
      await fulfill(route, {});
      return;
    }

    await fulfill(route, {});
  });

  return state;
}

function createTestJwt() {
  const header = toBase64Url({ alg: "HS256", typ: "JWT" });
  const payload = toBase64Url({
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    sub: user.id,
    email: user.email,
    role: "authenticated",
  });

  return `${header}.${payload}.signature`;
}

function toBase64Url(value: unknown) {
  return Buffer.from(JSON.stringify(value))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function fulfill(route: Route, json: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
      "content-type": "application/json",
    },
    body: JSON.stringify(json),
  });
}

function readJsonBody<T>(body: string | null): T {
  return body ? (JSON.parse(body) as T) : ({} as T);
}

test.describe("MenuQR smoke flows", () => {
  test("public menu renders restaurant data and categories", async ({ page }) => {
    await mockMenuQrApi(page);

    await page.goto("/m/restaurant-1");

    await expect(page.getByRole("heading", { name: "Rossetto" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Starters" })).toBeVisible();
    await expect(page.getByText("Mozzarella Sticks")).toBeVisible();
    await expect(page.getByText("R$7.99")).toBeVisible();
  });

  test("menu editor can add a category and an item", async ({ page }) => {
    await mockMenuQrApi(page);

    await page.goto("/dashboard/menu");

    await expect(page.getByRole("heading", { name: "Edit Menu" })).toBeVisible();
    await page.getByPlaceholder(/New Category Name/i).fill("Desserts");
    await page.getByRole("button", { name: /Add Category/i }).click();
    await expect(page.getByText("Category added")).toBeVisible();

    await page.getByLabel(/Select Category/i).selectOption({ label: "Desserts" });
    await page.getByPlaceholder("Item Name").fill("Chocolate Cake");
    await page.getByPlaceholder(/Price/i).fill("8.50");
    await page.getByRole("button", { name: /^Add Item$/i }).click();

    await expect(page.getByText("Item added")).toBeVisible();
    await expect(page.getByText("Chocolate Cake")).toBeVisible();
  });

  test("settings can preview and save menu layout", async ({ page, context }) => {
    await mockMenuQrApi(page);

    await page.goto("/dashboard/settings");

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByLabel("Menu Layout").selectOption("classic");

    const previewPromise = context.waitForEvent("page");
    await page.getByRole("button", { name: /Open visualizer/i }).click();
    const preview = await previewPromise;
    await preview.waitForLoadState("domcontentloaded");
    await expect(preview).toHaveURL(/previewTheme=classic/);
    await expect(preview.getByRole("heading", { name: "Rossetto" })).toBeVisible();
    await preview.close();

    await page.getByRole("button", { name: /Save Settings/i }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
  });

  test("checkout CTA requests a Stripe checkout session", async ({ page }) => {
    await mockMenuQrApi(page, { plan: "free" });

    await page.goto("/dashboard/settings");

    await page.getByRole("button", { name: /Upgrade to Professional/i }).click();
    await expect(page).toHaveURL(/checkout-smoke/);
  });

  test("AI import drafts and imports reviewed menu items", async ({ page }) => {
    await mockMenuQrApi(page, { plan: "pro" });

    await page.goto("/dashboard/menu");

    await page.getByRole("button", { name: /Import menu/i }).click();
    await page.locator('input[type="file"][accept="image/*,.pdf,application/pdf"]').setInputFiles({
      name: "menu.png",
      mimeType: "image/png",
      buffer: Buffer.from("fake image"),
    });
    await page.getByRole("button", { name: /Create import draft/i }).click();

    const importModal = page.locator(".app-modal-shell");
    await expect(importModal.getByPlaceholder("Category name")).toHaveValue("Imported Specials");
    await expect(importModal.getByPlaceholder("Item Name")).toHaveValue("Garlic Bread");

    await page.getByRole("button", { name: /Import reviewed items/i }).click();

    await expect(page.getByText("Import complete")).toBeVisible();
    await expect(page.getByText("Garlic Bread")).toBeVisible();
  });
});
