import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { AdminUser, UserRole } from "@/types/admin";
import { formatMad } from "@/lib/format";
import { Dropdown } from "@/components/ui/dropdown";

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
        {filtered.map((u) => (
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
            <button
              onClick={async () => {
                await supabaseAdminApi.toggleUserActive(u.id);
                toast.success(u.actif ? "Compte suspendu" : "Compte réactivé");
                refresh();
              }}
              className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {u.actif ? "Suspendre" : "Réactiver"}
            </button>
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
            {filtered.map((u) => (
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openCreate && (
        <CreateUserDialog
          onClose={() => setOpenCreate(false)}
          onCreated={() => { setOpenCreate(false); refresh(); }}
        />
      )}
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
