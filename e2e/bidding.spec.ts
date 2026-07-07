import { test, expect } from "@playwright/test";
import { runSql } from "./db";
import { loginAs, DEMO_ACCOUNTS } from "./fixtures";

const CAR_ID = "e2etst1";
const AUCTION_ID = "e2etst1-auction";

test.describe("bidding + auto-bid", () => {
  test.beforeEach(() => {
    // Fresh car + live auction for every test — avoids order-dependence and
    // leftover state between runs (bid amounts, auto_bids caps, etc.).
    runSql(`
      DELETE FROM public.auto_bids WHERE auction_id = '${AUCTION_ID}';
      DELETE FROM public.bids WHERE auction_id = '${AUCTION_ID}';
      DELETE FROM public.auctions WHERE id = '${AUCTION_ID}';
      DELETE FROM public.expert_assignments WHERE car_id = '${CAR_ID}';
      DELETE FROM public.cars WHERE id = '${CAR_ID}';

      INSERT INTO public.cars (
        id, vendeur_id, vendeur_nom, type, marque, modele, finition, transmission,
        carburant, annee, kilometrage, couleur_exterieur, couleur_interieur,
        puissance_fiscale, nombre_cles, prix_plancher, status, images
      )
      SELECT '${CAR_ID}', user_id, 'Karim Bennani', 'particulier', 'Peugeot', '208', '',
             'manuelle', 'essence', 2020, 20000, 'Blanc', 'Noir', 5, 2, 60000, 'expertise', '[]'::jsonb
      FROM public.user_roles WHERE role = 'vendeur' LIMIT 1;

      INSERT INTO public.auctions (
        id, car_id, starts_at, ends_at, starting_price, current_price, status, visibility, auction_type
      ) VALUES (
        '${AUCTION_ID}', '${CAR_ID}', now(), now() + interval '1 day', 60000, 60000, 'live', 'ouvert', 'ouverte'
      );
    `);
  });

  test.afterEach(() => {
    runSql(`
      DELETE FROM public.auto_bids WHERE auction_id = '${AUCTION_ID}';
      DELETE FROM public.bids WHERE auction_id = '${AUCTION_ID}';
      DELETE FROM public.auctions WHERE id = '${AUCTION_ID}';
      DELETE FROM public.expert_assignments WHERE car_id = '${CAR_ID}';
      DELETE FROM public.cars WHERE id = '${CAR_ID}';
    `);
  });

  test("auction page loads without crashing and shows the starting price", async ({ page }) => {
    await loginAs(page, "acheteur");
    await page.goto(`/auctions/${AUCTION_ID}`);
    // Regression guard: a car.images value that isn't an array (e.g. a
    // malformed `{}` instead of `[]`) previously crashed this whole page
    // with "car.images.map is not a function" — see supabaseApi.ts's mapCar.
    await expect(page.locator("text=Une erreur est survenue")).toHaveCount(0);
    await expect(page.getByText("60.000 DH")).toBeVisible();
  });

  test("placing a quick +1000 bid updates the displayed current price", async ({ page }) => {
    await loginAs(page, "acheteur");
    await page.goto(`/auctions/${AUCTION_ID}`);
    // canBid depends on the caution-status fetch resolving after mount —
    // wait for the "not bid yet" prompt (renders only once that's settled)
    // so the click below doesn't race a still-loading auth/caution state.
    await expect(page.getByText("Vous n'avez pas encore enchéri sur ce lot.")).toBeVisible();
    await page.getByRole("button", { name: "+1 000 DH" }).click();
    // .complementary is the price sidebar — the same amount also appears in
    // the bid-history list, so scope the assertion to avoid ambiguity.
    await expect(page.getByRole("complementary").getByText("61.000 DH")).toBeVisible({ timeout: 10_000 });
  });

  test("auto-bid fires when outbid and disables once the cap is reached", async ({ page }) => {
    await loginAs(page, "acheteur");
    await page.goto(`/auctions/${AUCTION_ID}`);
    await expect(page.getByText("Vous n'avez pas encore enchéri sur ce lot.")).toBeVisible();

    await page.getByRole("button", { name: "Auto-enchère" }).click();
    // Placeholder is dynamic (currentPrice + 1000 at time of render) — 61.000
    // DH for this fixture's 60.000 DH starting price, not a fixed string.
    await page.getByPlaceholder("ex. 61.000 DH").fill("62000");
    await page.getByRole("button", { name: "Auto-enchère" }).click();

    // Simulate a competing bid from another buyer directly against the RPC
    // (a second real browser session isn't worth the complexity here) —
    // exactly at the auto-bidder's cap, so the +1000 auto-rebid would push
    // past it and must be refused instead of firing.
    runSql(`
      BEGIN;
      SET LOCAL ROLE authenticated;
      SET LOCAL request.jwt.claim.sub = '47357dc9-1f50-4b97-a627-776fd949c2e9';
      SELECT * FROM public.place_bid('${AUCTION_ID}', 62000, false);
      COMMIT;
    `);

    await page.reload();
    await expect(page.getByRole("complementary").getByText("62.000 DH")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Vous avez été surenchéri")).toBeVisible();
  });
});
