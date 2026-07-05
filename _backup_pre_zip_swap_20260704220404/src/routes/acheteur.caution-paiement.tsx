import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Loader2, ShieldCheck, Upload, Building2, FileCheck2, Wallet, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatMad } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { storage, paymentPaths } from "@/lib/storage";
import { toast } from "sonner";

const CAUTION_AMOUNT = 5000;

type Method = "virement" | "cheque" | "especes";

export const Route = createFileRoute("/acheteur/caution-paiement")({
  head: () => ({
    meta: [
      { title: "Dépôt de la caution — Bidlik" },
      { name: "description", content: "Déposez votre caution remboursable par virement, chèque ou espèces. Un administrateur validera votre justificatif." },
    ],
  }),
  component: CautionPaiementPage,
});

function CautionPaiementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [method, setMethod] = useState<Method>("virement");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [accept, setAccept] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.cautionValidee) {
      toast.info("Votre caution est déjà active.");
      navigate({ to: "/acheteur/caution" });
    }
  }, [user, navigate]);

  async function submit() {
    if (!file) return toast.error("Veuillez joindre un justificatif (image ou PDF).");
    if (!accept) return toast.error("Veuillez accepter les conditions.");
    if (method !== "especes" && !reference.trim())
      return toast.error("Merci d'indiquer la référence du paiement.");

    setLoading(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) {
        toast.error("Veuillez vous reconnecter.");
        setLoading(false);
        return;
      }
      const uploaded = await storage.uploadFile({
        file,
        bucket: "payment-proofs",
        buildPath: (ext) => paymentPaths.userCaution(uid, ext),
      });
      const path = uploaded.path;

      const { error } = await supabase.rpc("buyer_submit_caution", {
        p_amount: CAUTION_AMOUNT,
        p_reference: reference.trim(),
        p_proof_url: path,
        p_proof_name: uploaded.name,
        p_notes: notes.trim(),
        p_payment_method: method,
        p_bank: bank.trim(),
      } as never);
      if (error) throw new Error(error.message);

      toast.success("Justificatif envoyé. Un administrateur va valider votre caution.");
      navigate({ to: "/acheteur/caution" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur d'envoi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Link
        to="/acheteur/caution"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h1 className="text-xl font-semibold text-foreground">Dépôt de la caution</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Caution remboursable de <span className="font-semibold text-foreground">{formatMad(CAUTION_AMOUNT)}</span> requise pour participer aux enchères.
              Choisissez votre mode de paiement et téléversez le justificatif. Votre caution sera activée après validation par un administrateur.
            </p>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Mode de paiement
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <MethodOption
                active={method === "virement"}
                onClick={() => setMethod("virement")}
                icon={<Building2 className="h-5 w-5" />}
                title="Virement bancaire"
                subtitle="Dépôt en caisse ou virement"
              />
              <MethodOption
                active={method === "cheque"}
                onClick={() => setMethod("cheque")}
                icon={<FileCheck2 className="h-5 w-5" />}
                title="Chèque"
                subtitle="Remise ou dépôt du chèque"
              />
              <MethodOption
                active={method === "especes"}
                onClick={() => setMethod("especes")}
                icon={<Wallet className="h-5 w-5" />}
                title="Espèces"
                subtitle="Dépôt en agence / caisse"
              />
              <MethodOption
                disabled
                icon={<CreditCard className="h-5 w-5" />}
                title="Carte bancaire (CMI)"
                subtitle="Bientôt disponible"
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Informations du paiement
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {method !== "especes" && (
                <Field label={method === "cheque" ? "Numéro du chèque" : "Référence du virement"} required>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder={method === "cheque" ? "N° du chèque" : "Ex: VIR-2025-01234"}
                  />
                </Field>
              )}
              {method !== "especes" && (
                <Field label="Banque">
                  <input
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    placeholder="Nom de la banque"
                  />
                </Field>
              )}
              <Field label="Notes (facultatif)" className="sm:col-span-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Toute information utile pour l'administrateur"
                />
              </Field>
              <Field label="Justificatif (image ou PDF)" required className="sm:col-span-2">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm hover:bg-muted/50">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Upload className="h-4 w-4" />
                    {file ? file.name : "Cliquez pour sélectionner un fichier"}
                  </span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </Field>
            </div>
          </section>
        </div>

        <aside className="lg:col-span-1">
          <div className="sticky top-4 space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-semibold">Validation manuelle</span>
            </div>

            <div className="rounded-lg bg-background p-3 text-center">
              <p className="text-xs text-muted-foreground">Montant de la caution</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{formatMad(CAUTION_AMOUNT)}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              Après envoi, votre demande apparaît comme « en attente ». Elle sera activée dès qu'un administrateur aura vérifié le justificatif.
            </p>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
              />
              <span>
                Je certifie que les informations et le justificatif fournis sont exacts et j'accepte les{" "}
                <a href="#" className="underline">conditions générales</a>.
              </span>
            </label>

            <button
              onClick={submit}
              disabled={loading || !accept || !file}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Envoyer le justificatif
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MethodOption({
  active,
  disabled,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
        disabled
          ? "cursor-not-allowed border-border bg-muted/40 opacity-60"
          : active
            ? "border-accent bg-accent/5"
            : "border-border bg-background hover:bg-muted/50",
      ].join(" ")}
    >
      <div className={[
        "flex h-10 w-10 items-center justify-center rounded-md",
        active ? "bg-accent text-accent-foreground" : "bg-secondary text-foreground",
      ].join(" ")}>{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </button>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}
