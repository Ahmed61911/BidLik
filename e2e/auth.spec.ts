import { test, expect } from "@playwright/test";
import { loginAs, DEMO_ACCOUNTS, type Role } from "./fixtures";

const roles = Object.keys(DEMO_ACCOUNTS) as Role[];

for (const role of roles) {
  test(`${role} demo account can log in and lands on their home`, async ({ page }) => {
    await loginAs(page, role);
    await expect(page).toHaveURL(new RegExp(DEMO_ACCOUNTS[role].home));
  });
}

test("wrong password shows an error and does not navigate away from /login", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="phone"]', DEMO_ACCOUNTS.admin.email);
  await page.fill('input[name="password"]', "wrong-password-123");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/login/);
});
