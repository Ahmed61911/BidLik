import type { Page } from "@playwright/test";

export const DEMO_ACCOUNTS = {
  admin: { email: "admin@bidlik.ma", password: "Admin1234!", home: "/admin" },
  expert: { email: "expert@bidlik.ma", password: "Expert1234!", home: "/expert" },
  vendeur: { email: "vendeur@bidlik.ma", password: "Vendeur1234!", home: "/vendeur" },
  acheteur: { email: "acheteur@bidlik.ma", password: "Acheteur1234!", home: "/acheteur" },
} as const;

export type Role = keyof typeof DEMO_ACCOUNTS;

export async function loginAs(page: Page, role: Role) {
  const { email, password } = DEMO_ACCOUNTS[role];
  await page.goto("/login");
  // Wait for hydration to actually attach the form's onSubmit handler —
  // clicking too early falls back to a native GET submission, which reloads
  // /login with the password sitting in plaintext in the URL query string.
  await page.locator('button[type="submit"]').waitFor({ state: "visible" });
  await page.waitForLoadState("networkidle");
  await page.fill('input[name="phone"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 });
}
