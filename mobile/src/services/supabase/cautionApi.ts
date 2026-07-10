/** Ported from webapp/src/routes/acheteur.caution-paiement.tsx's buyer_submit_caution call. */
import { supabase } from "@/services/supabase/client";

export const CAUTION_AMOUNT = 5000;

export async function submitBuyerCaution(input: {
  reference: string;
  proofUrl: string;
  proofName: string;
  notes?: string;
  paymentMethod: "virement" | "cheque" | "especes";
  bank?: string;
}): Promise<void> {
  const { error } = await supabase.rpc("buyer_submit_caution", {
    p_amount: CAUTION_AMOUNT,
    p_reference: input.reference,
    p_proof_url: input.proofUrl,
    p_proof_name: input.proofName,
    p_notes: input.notes ?? "",
    p_payment_method: input.paymentMethod,
    p_bank: input.bank ?? "",
  } as never);
  if (error) throw new Error(error.message);
}
