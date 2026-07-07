import { describe, it, expect } from "vitest";
import { deriveStage } from "@/lib/supabaseVendeurApi";
import type { CarStatus, PaymentStatus, DeliveryStatus } from "@/types/auction";

function makeCar(status: CarStatus) {
  return {
    id: "00001",
    marque: "Test",
    modele: "Model",
    annee: 2022,
    kilometrage: 10_000,
    prix_plancher: 100_000,
    note_expert: null,
    status,
    payment_status: "non_paye" as PaymentStatus,
    delivery_status: "non_livre" as DeliveryStatus,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

function makeAuction(status: string) {
  return {
    id: "a1",
    car_id: "00001",
    status,
    current_price: 100_000,
    bid_count: 0,
    top_bidder_id: null,
  };
}

function makeAssignment(status: string) {
  return { car_id: "00001", status, expert_id: "expert-1" };
}

describe("deriveStage", () => {
  it("is 'vendu' once the car itself is marked vendu_validee", () => {
    expect(deriveStage(makeCar("vendu_validee"), undefined, undefined)).toBe("vendu");
  });

  it("is 'annulee' once the car itself is marked vendu_annulee", () => {
    expect(deriveStage(makeCar("vendu_annulee"), undefined, undefined)).toBe("annulee");
  });

  // Precedence check: cars.status is the authoritative final-sale signal and
  // must win even if a stale auction/assignment row disagrees (this exact
  // class of "authoritative status vs. derived-from-child-rows" bug bit the
  // car_status='expertise' issue fixed earlier this project).
  it("car.status=vendu_validee wins even over a live auction row", () => {
    const stage = deriveStage(makeCar("vendu_validee"), makeAuction("live"), undefined);
    expect(stage).toBe("vendu");
  });

  it("is 'vendu' when the auction itself is validated", () => {
    expect(deriveStage(makeCar("en_cours"), makeAuction("validated"), undefined)).toBe("vendu");
  });

  it("is 'annulee' when the auction is cancelled", () => {
    expect(deriveStage(makeCar("en_cours"), makeAuction("cancelled"), undefined)).toBe("annulee");
  });

  it("is 'en_attente_validation' when the auction closed but isn't decided yet", () => {
    expect(deriveStage(makeCar("en_cours"), makeAuction("closed"), undefined)).toBe(
      "en_attente_validation",
    );
  });

  it("is 'en_enchere' for a live auction", () => {
    expect(deriveStage(makeCar("en_cours"), makeAuction("live"), undefined)).toBe("en_enchere");
  });

  it("is 'en_enchere' for a scheduled (not-yet-started) auction", () => {
    expect(deriveStage(makeCar("en_cours"), makeAuction("scheduled"), undefined)).toBe(
      "en_enchere",
    );
  });

  it("an auction (any status) takes priority over assignment info", () => {
    const stage = deriveStage(makeCar("open"), makeAuction("live"), makeAssignment("rapport_recu"));
    expect(stage).toBe("en_enchere");
  });

  it("is 'rapport_recu' once the expert has submitted a report and there's no auction yet", () => {
    expect(deriveStage(makeCar("expertise"), undefined, makeAssignment("rapport_recu"))).toBe(
      "rapport_recu",
    );
  });

  it("is 'en_inspection' while the expert is assigned but hasn't reported yet", () => {
    expect(deriveStage(makeCar("open"), undefined, makeAssignment("en_inspection"))).toBe(
      "en_inspection",
    );
  });

  it("falls through to 'brouillon' for a not-yet-assigned car", () => {
    expect(deriveStage(makeCar("open"), undefined, makeAssignment("non_assigne"))).toBe(
      "brouillon",
    );
  });

  it("is 'brouillon' with neither an auction nor an assignment row at all", () => {
    expect(deriveStage(makeCar("open"), undefined, undefined)).toBe("brouillon");
  });
});
