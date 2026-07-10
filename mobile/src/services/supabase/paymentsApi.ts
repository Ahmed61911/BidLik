/**
 * Ported from webapp/src/lib/supabaseAcheteurStore.ts's post-closure payment
 * workflow section — same RPCs, same shapes.
 */
import { supabase } from "@/services/supabase/client";
import { getSignedUrl } from "@/services/storage";

export interface PendingPaymentAuction {
  auctionId: string;
  carId: string;
  marque: string;
  modele: string;
  annee: number;
  prixFinal: number;
  validatedAt: string | null;
  paymentDeadline: string | null;
  paymentStatus: "none" | "en_attente" | "paye" | "annule";
  paymentId: string | null;
  proofUrl: string | null;
  proofName: string | null;
}

export async function listMyPendingPaymentAuctions(): Promise<PendingPaymentAuction[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: rawAuctions, error } = await supabase.rpc("list_my_pending_payment_auctions" as never);
  if (error) throw new Error(error.message);
  const auctionRows = (rawAuctions ?? []) as Array<{
    id: string;
    car_id: string;
    current_price: number;
    validated_at: string | null;
    payment_deadline: string | null;
    status: string;
  }>;
  const auctionIds = auctionRows.map((a) => a.id);
  const carIds = Array.from(new Set(auctionRows.map((a) => a.car_id)));
  const carMap = new Map<string, { marque: string; modele: string; annee: number }>();
  if (carIds.length > 0) {
    const { data: cars } = await supabase.from("cars").select("id, marque, modele, annee").in("id", carIds);
    (cars ?? []).forEach((c) => carMap.set(c.id as string, { marque: c.marque as string, modele: c.modele as string, annee: c.annee as number }));
  }
  const payByAuction = new Map<string, { id: string; status: string; proof_url: string | null; proof_name: string | null }>();
  if (auctionIds.length > 0) {
    const { data: pays } = await supabase
      .from("payments")
      .select("id, auction_id, status, proof_url, proof_name")
      .in("auction_id", auctionIds)
      .eq("user_id", uid)
      .eq("type", "achat");
    (pays ?? []).forEach((p) =>
      payByAuction.set(p.auction_id as string, {
        id: p.id as string,
        status: p.status as string,
        proof_url: (p.proof_url as string) ?? null,
        proof_name: (p.proof_name as string) ?? null,
      }),
    );
  }

  return auctionRows.map((a) => {
    const car = carMap.get(a.car_id) ?? null;
    const p = payByAuction.get(a.id);
    return {
      auctionId: a.id,
      carId: a.car_id,
      marque: car?.marque ?? "",
      modele: car?.modele ?? "",
      annee: car?.annee ?? 0,
      prixFinal: a.current_price,
      validatedAt: a.validated_at,
      paymentDeadline: a.payment_deadline,
      paymentStatus: (p?.status as PendingPaymentAuction["paymentStatus"]) ?? "none",
      paymentId: p?.id ?? null,
      proofUrl: p?.proof_url ?? null,
      proofName: p?.proof_name ?? null,
    };
  });
}

export async function submitBuyerPayment(input: {
  auctionId: string;
  amount: number;
  reference: string;
  proofUrl: string;
  proofName: string;
  notes?: string;
  paymentMethod?: string | null;
  bank?: string | null;
  dueDate?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("buyer_submit_payment", {
    p_auction_id: input.auctionId,
    p_amount: Math.round(input.amount),
    p_reference: input.reference,
    p_proof_url: input.proofUrl,
    p_proof_name: input.proofName,
    p_notes: input.notes ?? "",
    p_payment_method: input.paymentMethod ?? null,
    p_bank: input.bank ?? null,
    p_due_date: input.dueDate ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

export async function signedPaymentProofUrl(path: string): Promise<string> {
  return getSignedUrl("payment-proofs", path);
}
