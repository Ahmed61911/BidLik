/**
 * Admin-side payments management.
 * All settlements (except buyer caution) are recorded here by the admin,
 * who attaches a proof file (PDF/image) and a payment reference.
 */
import { supabase } from "@/integrations/supabase/client";
import { storage, paymentPaths } from "@/lib/storage";

export type AdminPaymentType =
  | "achat"
  | "virement_vendeur"
  | "commission"
  | "remboursement"
  | "caution";

export type AdminPaymentStatus = "en_attente" | "paye" | "rembourse" | "annule";

export type PaymentMethod = "virement" | "cheque" | "especes" | "carte" | "autre";

export interface AdminPayment {
  id: string;
  userId: string;
  userNom: string | null;
  userEmail: string | null;
  type: AdminPaymentType;
  amount: number;
  status: AdminPaymentStatus;
  auctionId: string | null;
  carId: string | null;
  carLabel: string | null;
  reference: string | null;
  proofUrl: string | null;
  proofName: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  paymentMethod: PaymentMethod | null;
  bank: string | null;
  dueDate: string | null;
}

export interface UpsertPaymentInput {
  id?: string | null;
  userId: string;
  type: AdminPaymentType;
  amount: number;
  status: AdminPaymentStatus;
  auctionId?: string | null;
  carId?: string | null;
  reference?: string | null;
  proofUrl?: string | null;
  proofName?: string | null;
  notes?: string | null;
  paidAt?: string | null;
  paymentMethod?: PaymentMethod | null;
  bank?: string | null;
  dueDate?: string | null;
}


/**
 * Admin proof-file kind. Drives the target folder in payment-proofs bucket.
 *  - "refund"   → admin/refunds/…
 *  - "generic"  → admin/generic/…  (default catch-all for out-of-band settlements)
 *  - "carPayment" → cars/{carId}/payments/…  (only when a carId is provided)
 */
export type AdminProofKind = "refund" | "generic" | "carPayment";

export const supabaseAdminPaiements = {
  async list(): Promise<AdminPayment[]> {
    const { data, error } = await supabase.rpc("admin_list_payments");
    if (error) throw new Error(error.message);
    return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      userNom: (r.user_nom as string) ?? null,
      userEmail: (r.user_email as string) ?? null,
      type: r.type as AdminPaymentType,
      amount: r.amount as number,
      status: r.status as AdminPaymentStatus,
      auctionId: (r.auction_id as string) ?? null,
      carId: (r.car_id as string) ?? null,
      carLabel: (r.car_label as string) ?? null,
      reference: (r.reference as string) ?? null,
      proofUrl: (r.proof_url as string) ?? null,
      proofName: (r.proof_name as string) ?? null,
      notes: (r.notes as string) ?? null,
      paidAt: (r.paid_at as string) ?? null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      paymentMethod: (r.payment_method as PaymentMethod) ?? null,
      bank: (r.bank as string) ?? null,
      dueDate: (r.due_date as string) ?? null,
    }));
  },

  async upsert(input: UpsertPaymentInput): Promise<void> {
    const { error } = await supabase.rpc("admin_upsert_payment", {
      p_id: input.id ?? null,
      p_user_id: input.userId,
      p_type: input.type,
      p_amount: Math.round(input.amount),
      p_status: input.status,
      p_auction_id: input.auctionId ?? null,
      p_car_id: input.carId ?? null,
      p_reference: input.reference ?? null,
      p_proof_url: input.proofUrl ?? null,
      p_proof_name: input.proofName ?? null,
      p_notes: input.notes ?? null,
      p_paid_at: input.paidAt ?? null,
      p_payment_method: input.paymentMethod ?? null,
      p_bank: input.bank ?? null,
      p_due_date: input.dueDate ?? null,
    } as never);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.rpc("admin_delete_payment", { p_id: id });
    if (error) throw new Error(error.message);
  },

  async setStatus(id: string, status: AdminPaymentStatus): Promise<void> {
    const { error } = await supabase.rpc("admin_set_payment_status", {
      p_id: id,
      p_status: status,
    } as never);
    if (error) throw new Error(error.message);
  },

  async listPendingBuyerPayments(): Promise<AdminPayment[]> {
    const all = await this.list();
    return all.filter((p) => p.type === "achat" && p.status === "en_attente");
  },

  /**
   * Upload an admin-side proof file through the central storage service.
   * Chooses the folder from `kind`; `carId` is required only for "carPayment".
   */
  async uploadProof(
    file: File,
    kind: AdminProofKind = "generic",
    carId?: string | null,
  ): Promise<{ path: string; name: string }> {
    const buildPath =
      kind === "refund"
        ? (ext: string) => paymentPaths.adminRefund(ext)
        : kind === "carPayment" && carId
          ? (ext: string) => paymentPaths.carPayment(carId, "admin", ext)
          : (ext: string) => paymentPaths.adminGeneric(ext);
    const r = await storage.uploadFile({ file, bucket: "payment-proofs", buildPath });
    return { path: r.path, name: r.name };
  },

  async signedProofUrl(path: string): Promise<string> {
    return storage.signedUrl("payment-proofs", path);
  },

  async removeProof(path: string): Promise<void> {
    await storage.remove("payment-proofs", [path]);
  },
};
