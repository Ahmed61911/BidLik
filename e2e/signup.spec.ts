import { test, expect } from "@playwright/test";
import { runSql } from "./db";

// Cleans up any account created by the tests below so re-runs stay idempotent.
function deleteTestAccountByPhone(phone: string) {
  runSql(`
    DO $$
    DECLARE uid uuid;
    BEGIN
      SELECT user_id INTO uid FROM public.profiles WHERE telephone = '${phone}';
      IF uid IS NOT NULL THEN
        DELETE FROM public.user_roles WHERE user_id = uid;
        DELETE FROM public.profiles WHERE user_id = uid;
        DELETE FROM auth.identities WHERE user_id = uid;
        DELETE FROM auth.users WHERE id = uid;
      END IF;
    END $$;
  `);
}

test.describe("signup", () => {
  const phone = "+212699887766";

  test.afterEach(() => {
    deleteTestAccountByPhone(phone);
  });

  test("blocks submission when passwords don't match, staying on /login", async ({ page }) => {
    await page.goto("/login");
    await page.click('button:text("Inscription")');
    await page.fill('input[name="name"]', "E2E Test User");
    await page.fill('input[name="phone"]', phone);
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="password_confirm"]', "Mismatch123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test("successful signup navigates to the pending-validation page", async ({ page }) => {
    await page.goto("/login");
    await page.click('button:text("Inscription")');
    await page.fill('input[name="name"]', "E2E Test User");
    await page.fill('input[name="phone"]', phone);
    await page.fill('input[name="password"]', "Password123!");
    await page.fill('input[name="password_confirm"]', "Password123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/inscription-en-attente/, { timeout: 10_000 });
  });
});
