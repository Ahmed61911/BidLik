import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { AdminUser, UserRole } from "@/types/admin";
import { formatMad } from "@/lib/format";
import { Dropdown } from "@/components/ui/dropdown";
import { usePagination } from "@/hooks/use-pagination";
import { ListPagination } from "@/components/ListPagination";

export const Route = createFileRoute("/admin/utilisateurs")({
  component: AdminUsersPage,
});

const ROLE_LABEL: Record<UserRole, string> = {
  acheteur: "Acheteur",
  vendeur: "Vendeur",
  expert: "Expert",
  admin: "Admin",
};

function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | "all">("all");
  const [query, setQuery] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);

  const refresh = () => {
    setLoading(true);
    supabaseAdminApi.listUsers().then((u) => {
      setUsers(u);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (role !== "all" && u.role !== role) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return u.nom.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, role, query]);
  const { page, setPage, pageCount, pageItems: paged } = usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Utilisateurs</h2>
          <p className="text-xs text-muted-foreground">{users.length} comptes au total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dropdown
            value={role}
            onChange={(v) => setRole(v as UserRole | "all")}
            ariaLabel="Filtrer par rôle"
            className="w-full sm:w-48"
            size="sm"
            options={[
              { value: "all", label: "Tous les rôles" },
              { value: "acheteur", label: "Acheteurs" },
              { value: "vendeur", label: "Vendeurs" },
              { value: "expert", label: "Experts" },
              { value: "admin", label: "Admins" },
            ]}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-56"
          />
          <button
            onClick={() => setOpenCreate(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {loading && <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && filtered.length === 0 && <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucun utilisateur.</p>}
        {paged.map((u) => (
          <div key={u.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{u.nom}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.telephone}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">{ROLE_LABEL[u.role]}</span>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.actif ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{u.actif ? "Actif" : "Suspendu"}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Caution : {u.cautionDeposee ? <span className="font-medium text-success">{formatMad(u.cautionMontant)}</span> : "—"}</span>
              <span className="text-muted-foreground">{u.inscritLe}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={async () => {
                  await supabaseAdminApi.toggleUserActive(u.id);
                  toast.success(u.actif ? "Compte suspendu" : "Compte réactivé");
                  refresh();
                }}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {u.actif ? "Suspendre" : "Réactiver"}
              </button>
              <button
                onClick={() => setResetTarget(u)}
                className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
              >
                Mot de passe
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Caution</th>
              <th className="px-4 py-3">Inscrit le</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Chargement…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Aucun utilisateur.</td></tr>}
            {paged.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{u.nom}</p>
                  <p className="text-xs text-muted-foreground">{u.email} · {u.telephone}</p>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                    {ROLE_LABEL[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.cautionDeposee ? (
                    <span className="font-medium text-success">{formatMad(u.cautionMontant)}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.inscritLe}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.actif ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {u.actif ? "Actif" : "Suspendu"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setResetTarget(u)}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      Mot de passe
                    </button>
                    <button
                      onClick={async () => {
                        await supabaseAdminApi.toggleUserActive(u.id);
                        toast.success(u.actif ? "Compte suspendu" : "Compte réactivé");
                        refresh();
                      }}
                      className="inline-flex h-8 items-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      {u.actif ? "Suspendre" : "Réactiver"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {openCreate && (
        <CreateUserDialog
          onClose={() => setOpenCreate(false)}
          onCreated={() => { setOpenCreate(false); refresh(); }}
        />
      )}

      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      )}
    </div>
  );
}

function ResetPasswordDialog({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const [mode, setMode] = useState<"generate" | "custom">("generate");
  const [customPassword, setCustomPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "custom" && customPassword.trim().length < 8) {
      toast.error("8 caractères minimum");
      return;
    }
    setSaving(true);
    try {
      const { newPassword } = await supabaseAdminApi.resetUserPassword(
        user.id,
        mode === "custom" ? customPassword.trim() : undefined,
      );
      toast.success("Mot de passe réinitialisé");
      setResult(newPassword ?? customPassword.trim());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Réinitialiser le mot de passe</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Pour <span className="font-medium text-foreground">{user.nom}</span> ({user.email})
        </p>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Nouveau mot de passe — communiquez-le à l'utilisateur :</p>
            <p className="rounded-md border border-border bg-secondary/50 px-3 py-2 font-mono text-sm text-foreground select-all">{result}</p>
            <div className="flex justify-end">
              <button onClick={onClose} className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90">
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <div className="flex rounded-lg border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => setMode("generate")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${mode === "generate" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Générer aléatoirement
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`flex-1 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${mode === "custom" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Définir un mot de passe
              </button>
            </div>
            {mode === "custom" && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Nouveau mot de passe</span>
                <input
                  autoFocus
                  type="text"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="8 caractères minimum"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
            )}
            <div className="mt-2 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">Annuler</button>
              <button disabled={saving} type="submit" className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">
                {saving ? "Réinitialisation…" : "Réinitialiser"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    role: "vendeur" as "admin" | "expert" | "vendeur",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom.trim() || !form.email.trim()) {
      toast.error("Nom et email obligatoires");
      return;
    }
    setSaving(true);
    try {
      await supabaseAdminApi.createUser(form);
      toast.success("Utilisateur créé");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Nouvel utilisateur</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Rôle</span>
            <Dropdown
              value={form.role}
              onChange={(v) => setForm({ ...form, role: v as typeof form.role })}
              ariaLabel="Rôle"
              name="role"
              options={[
                { value: "admin", label: "Admin" },
                { value: "expert", label: "Expert" },
                { value: "vendeur", label: "Vendeur" },
              ]}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Nom complet</span>
            <input
              required
              value={form.nom}
              onChange={(e) => setForm({ ...form, nom: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Téléphone</span>
            <input
              value={form.telephone}
              onChange={(e) => setForm({ ...form, telephone: e.target.value })}
              placeholder="+212 6 00 00 00 00"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <div className="mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">Annuler</button>
            <button disabled={saving} type="submit" className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
