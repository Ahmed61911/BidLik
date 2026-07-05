import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, X, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/verifications")({
  head: () => ({
    meta: [
      { title: "Validation des comptes — Admin Bidlik" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminVerificationsPage,
});

const ROLE_LABEL: Record<string, string> = {
  acheteur: "Acheteur",
  vendeur: "Vendeur",
  expert: "Expert",
  admin: "Admin",
};

type PendingUser = {
  user_id: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  role: string | null;
  created_at: string;
};

function AdminVerificationsPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_pending_users");
    if (error) toast.error(error.message);
    setUsers((data as PendingUser[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const approve = async (u: PendingUser) => {
    setBusyId(u.user_id);
    const { error } = await supabase.rpc("admin_set_user_active", { p_user_id: u.user_id, p_actif: true });
    if (error) toast.error(error.message);
    else { toast.success(`Compte de ${u.nom ?? u.email} validé`); await refresh(); }
    setBusyId(null);
  };

  const reject = async (u: PendingUser) => {
    if (!confirm(`Refuser et supprimer le compte de ${u.nom ?? u.email} ?`)) return;
    setBusyId(u.user_id);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/public/admin-delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: u.user_id }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Suppression impossible");
      toast.success("Compte refusé et supprimé");
      await refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Validation des comptes</h2>
          <p className="text-xs text-muted-foreground">
            {users.length} compte{users.length > 1 ? "s" : ""} en attente d'approbation
          </p>
        </div>
        <button
          onClick={refresh}
          className="inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-secondary"
        >
          Actualiser
        </button>
      </div>

      {loading ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Chargement…
        </p>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">Aucun compte en attente</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Les nouvelles inscriptions apparaîtront ici pour validation.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {users.map((u) => (
              <div key={u.user_id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{u.nom ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground">{u.telephone ?? "—"}</p>
                  </div>
                  <span className="inline-flex shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {ROLE_LABEL[u.role ?? "acheteur"]}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Inscrit le {new Date(u.created_at).toLocaleDateString("fr-MA")}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    disabled={busyId === u.user_id}
                    onClick={() => approve(u)}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-md bg-success px-3 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Approuver
                  </button>
                  <button
                    disabled={busyId === u.user_id}
                    onClick={() => reject(u)}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.user_id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{u.nom ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.email}{u.telephone ? ` · ${u.telephone}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                        {ROLE_LABEL[u.role ?? "acheteur"]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString("fr-MA")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          disabled={busyId === u.user_id}
                          onClick={() => approve(u)}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-success px-3 text-xs font-semibold text-success-foreground hover:opacity-90 disabled:opacity-60"
                        >
                          <Check className="h-3.5 w-3.5" /> Approuver
                        </button>
                        <button
                          disabled={busyId === u.user_id}
                          onClick={() => reject(u)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-destructive/40 bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/20 disabled:opacity-60"
                        >
                          <X className="h-3.5 w-3.5" /> Refuser
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
