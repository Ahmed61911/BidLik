import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2, X, ChevronLeft, ChevronRight, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";
import { resolveCarImageUrl } from "@/lib/carImages";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { Car } from "@/types/auction";
import { BODY_TYPES } from "@/types/auction";
import { formatMad } from "@/lib/format";
import { Dropdown } from "@/components/ui/dropdown";
import { CAR_CATALOG, CAR_MAKES } from "@/lib/carCatalog";
import { usePagination } from "@/hooks/use-pagination";
import { ListPagination } from "@/components/ListPagination";

export const Route = createFileRoute("/admin/voitures")({
  component: AdminCarsPage,
});


type CarRow = Car & { proprietaireId: string };

function AdminCarsPage() {
  const [cars, setCars] = useState<CarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CarRow | null>(null);
  const [previewing, setPreviewing] = useState<CarRow | null>(null);
  const [query, setQuery] = useState("");

  const refresh = () => {
    setLoading(true);
    supabaseAdminApi.listCars().then((c) => {
      setCars(c);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const handleDelete = async (c: CarRow) => {
    if (!confirm(`Supprimer ${c.marque} ${c.modele} ?`)) return;
    await supabaseAdminApi.deleteCar(c.id);
    toast.success("Voiture supprimée");
    if (previewing?.id === c.id) setPreviewing(null);
    refresh();
  };


  const filtered = cars.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.marque.toLowerCase().includes(q) ||
      c.modele.toLowerCase().includes(q) ||
      c.vendeurNom.toLowerCase().includes(q)
    );
  });
  const { page, setPage, pageCount, pageItems: paged } = usePagination(filtered, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Voitures</h2>
          <p className="text-xs text-muted-foreground">{cars.length} véhicules au catalogue</p>
        </div>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher…"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring sm:w-56"
          />
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {loading && <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Chargement…</p>}
        {!loading && filtered.length === 0 && <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucune voiture trouvée.</p>}
        {paged.map((c) => (
          <div
            key={c.id}
            onClick={() => setPreviewing(c)}
            className="cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm transition-colors hover:bg-secondary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground"><span className="font-mono text-muted-foreground">#{c.id}</span> · {c.marque} {c.modele}</p>
                <p className="text-xs text-muted-foreground">{c.bodyType || "—"} · {c.finition || "—"} · {c.couleurExterieur}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              <div><p className="text-[10px] uppercase text-muted-foreground">MEC (Mise En Circulation)</p><p className="font-medium">{c.annee}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">KM</p><p className="font-medium">{c.kilometrage.toLocaleString("fr-MA")}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Prix plancher</p><p className="font-medium">{formatMad(c.prixPlancher)}</p></div>
              <div><p className="text-[10px] uppercase text-muted-foreground">Prix minimum</p><p className="font-medium">{c.prixMinimum != null ? formatMad(c.prixMinimum) : "—"}</p></div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Vendeur : {c.vendeurNom}</p>
            <div className="mt-3 grid grid-cols-3 gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPreviewing(c)}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-secondary"
              >
                <Eye className="h-3.5 w-3.5" /> Voir
              </button>
              <button
                onClick={() => setEditing(c)}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </button>
              <button
                onClick={() => handleDelete(c)}
                className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Suppr.
              </button>
            </div>
          </div>
        ))}

      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm md:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Véhicule</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Vendeur</th>
              <th className="px-4 py-3">MEC</th>
              <th className="px-4 py-3">KM</th>
              <th className="px-4 py-3">Prix plancher</th>
              <th className="px-4 py-3">Prix minimum</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">Chargement…</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune voiture trouvée.</td></tr>
            )}
            {paged.map((c) => (
              <tr
                key={c.id}
                onClick={() => setPreviewing(c)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-secondary/40"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground"><span className="font-mono text-muted-foreground">#{c.id}</span> · {c.marque} {c.modele}</p>
                  <p className="text-xs text-muted-foreground">{c.finition || "—"} · {c.couleurExterieur}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.bodyType || "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.vendeurNom}</td>
                <td className="px-4 py-3">{c.annee}</td>
                <td className="px-4 py-3">{c.kilometrage.toLocaleString("fr-MA")}</td>
                <td className="px-4 py-3 font-medium text-foreground">{formatMad(c.prixPlancher)}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.prixMinimum != null ? formatMad(c.prixMinimum) : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center gap-2">
                    <button
                      onClick={() => setPreviewing(c)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-secondary"
                      title="Aperçu"
                    >
                      <Eye className="h-3.5 w-3.5" /> Voir
                    </button>
                    <button
                      onClick={() => setEditing(c)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors hover:bg-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ListPagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {open && <CarFormDialog onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
      {editing && <CarFormDialog existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {previewing && (
        <CarPreviewDialog
          car={previewing}
          onClose={() => setPreviewing(null)}
          onEdit={() => { setEditing(previewing); setPreviewing(null); }}
          onDelete={() => handleDelete(previewing)}
        />
      )}
    </div>
  );
}


function StatusBadge({ status }: { status: Car["status"] }) {
  const map: Record<Car["status"], { label: string; cls: string }> = {
    open: { label: "Ouverte", cls: "bg-secondary text-secondary-foreground" },
    en_cours: { label: "En cours", cls: "bg-accent/15 text-accent" },
    en_attente_validation: { label: "À valider", cls: "bg-warning/20 text-warning-foreground" },
    expertise: { label: "Expertisé", cls: "bg-primary/15 text-primary" },
    vendu_validee: { label: "Vendue", cls: "bg-success/15 text-success" },
    vendu_annulee: { label: "Annulée", cls: "bg-destructive/15 text-destructive" },
  };
  const { label, cls } = map[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>{label}</span>;
}

const EXPERT_LOCKED_FIELDS = [
  "marque",
  "modele",
  "annee",
  "kilometrage",
  "couleurExterieur",
  "couleurInterieur",
  "bodyType",
  "carburant",
  "transmission",
] as const;
type LockedField = (typeof EXPERT_LOCKED_FIELDS)[number];

function CarFormDialog({ existing, onClose, onSaved }: { existing?: CarRow; onClose: () => void; onSaved: () => void }) {
  const [lockedFields, setLockedFields] = useState<Set<LockedField>>(new Set());
  useEffect(() => {
    if (!existing) return;
    supabase
      .from("expert_assignments")
      .select("status")
      .eq("car_id", existing.id)
      .eq("status", "rapport_recu")
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setLockedFields(new Set(EXPERT_LOCKED_FIELDS));
      });
  }, [existing]);
  const isLocked = (f: LockedField) => lockedFields.has(f);

  const isEdit = !!existing;
  const [form, setForm] = useState({
    vendeurId: existing?.vendeurId ?? "",
    type: (existing?.type ?? "particulier") as "loueur" | "entreprise" | "particulier",
    bodyType: (existing?.bodyType ?? "") as string,
    marque: existing?.marque ?? "",
    modele: existing?.modele ?? "",
    finition: existing?.finition ?? "",
    transmission: (existing?.transmission ?? "manuelle") as "manuelle" | "automatique",
    carburant: (existing?.carburant ?? "essence") as "essence" | "diesel" | "essence_hybride" | "diesel_hybride" | "electrique",
    annee: existing?.annee ?? 2022,
    kilometrage: existing?.kilometrage ?? 50000,
    couleurExterieur: existing?.couleurExterieur ?? "",
    nombreCles: existing?.nombreCles ?? 2,
    opposition: existing?.opposition ?? false,
    mainLevee: existing?.mainLevee ?? true,
    puissanceFiscale: existing?.puissanceFiscale ?? 6,
    couleurInterieur: existing?.couleurInterieur ?? "",
    carteGriseBarree: existing?.carteGriseBarree ?? false,
    procuration: (existing?.procuration ?? "procuration") as "procuration" | "carton_ouvert" | "carton_ferme",
    prixPlancher: (existing?.prixPlancher ?? 0) as number,
    prixMinimum: (existing?.prixMinimum ?? 0) as number,
  });
  const [vendeurs, setVendeurs] = useState<{ id: string; nom: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [nextId, setNextId] = useState(existing?.id ?? "—");
  const initialMarque = existing && CAR_CATALOG[existing.marque] ? existing.marque : existing?.marque ? "__autre__" : "";
  const initialModele = existing && initialMarque !== "__autre__" && CAR_CATALOG[existing.marque]?.includes(existing.modele) ? existing.modele : existing?.modele ? "__autre__" : "";
  const [marqueSel, setMarqueSel] = useState(initialMarque);
  const [modeleSel, setModeleSel] = useState(initialModele);

  const isMarqueAutre = marqueSel === "__autre__";
  const isModeleAutre = modeleSel === "__autre__";
  const modelOptions = !isMarqueAutre && marqueSel && CAR_CATALOG[marqueSel]
    ? CAR_CATALOG[marqueSel]
    : [];

  useEffect(() => {
    supabaseAdminApi.listUsers().then((users) => {
      setVendeurs(users.filter((u) => u.role === "vendeur" && u.actif).map((u) => ({ id: u.id, nom: u.nom })));
    });
    if (!isEdit) {
      supabaseAdminApi.listCars().then((cs) => {
        const maxNum = cs.reduce((m, c) => { const n = parseInt(c.id, 10); return Number.isFinite(n) && n > m ? n : m; }, 100);
        setNextId(String(maxNum + 1).padStart(5, "0"));
      });
    }
  }, [isEdit]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.marque || !form.modele) {
      toast.error("Marque et modèle obligatoires");
      return;
    }
    if (!form.vendeurId) {
      toast.error("Veuillez assigner la voiture à un vendeur");
      return;
    }
    const vendeur = vendeurs.find((v) => v.id === form.vendeurId);
    setSaving(true);
    try {
      if (isEdit && existing) {
        await supabaseAdminApi.updateCar(existing.id, {
          ...form,
          vendeurNom: vendeur?.nom ?? existing.vendeurNom,
        });
        toast.success("Voiture mise à jour");
      } else {
        await supabaseAdminApi.createCar({
          ...form,
          vendeurNom: vendeur?.nom ?? "",
        });
        toast.success("Voiture créée et assignée au vendeur");
      }
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const yesNo = [
    { value: "oui", label: "Oui" },
    { value: "non", label: "Non" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{isEdit ? `Modifier voiture ${existing!.id}` : "Nouvelle voiture"}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {lockedFields.size > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Un rapport d'expert a été validé pour cette voiture. Les champs
              vérifiés (marque, modèle, MEC, kilométrage, couleurs, carburant,
              transmission, carrosserie) sont verrouillés.
            </p>
          </div>
        )}

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="ID">
            <input disabled value={nextId} className="input opacity-60 font-mono" />
          </Field>
          <Field label="Vendeur *">
            <Dropdown
              value={form.vendeurId}
              onChange={(v) => setForm({ ...form, vendeurId: v })}
              placeholder="— Choisir un vendeur —"
              ariaLabel="Vendeur"
              name="vendeurId"
              required
              options={vendeurs.map((v) => ({ value: v.id, label: v.nom }))}
            />
          </Field>
          <Field label="Type de vendeur">
            <Dropdown
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              ariaLabel="Type de vendeur"
              name="type"
              options={[
                { value: "particulier", label: "Particulier" },
                { value: "entreprise", label: "Entreprise" },
                { value: "loueur", label: "Loueur" },
              ]}
            />
          </Field>
          <Field label="Type (carrosserie)" locked={isLocked("bodyType")}>
            <Dropdown
              value={form.bodyType}
              onChange={(v) => setForm({ ...form, bodyType: v })}
              placeholder="— Choisir le type —"
              ariaLabel="Type de carrosserie"
              name="bodyType"
              options={BODY_TYPES.map((b) => ({ value: b, label: b }))}
            />
          </Field>
          <Field label="Marque" locked={isLocked("marque")}>
            <Dropdown
              value={marqueSel}
              onChange={(v) => {
                setMarqueSel(v);
                setModeleSel("");
                if (v === "__autre__") {
                  setForm({ ...form, marque: "", modele: "" });
                } else {
                  setForm({ ...form, marque: v, modele: "" });
                }
              }}
              placeholder="— Choisir une marque —"
              ariaLabel="Marque"
              name="marque"
              required
              options={[
                ...CAR_MAKES.map((m) => ({ value: m, label: m })),
                { value: "__autre__", label: "Autre" },
              ]}
            />
            {isMarqueAutre && (
              <input
                required
                value={form.marque}
                onChange={(e) => setForm({ ...form, marque: e.target.value })}
                placeholder="Saisir la marque"
                className="input mt-2"
              />
            )}
          </Field>
          <Field label="Modèle" locked={isLocked("modele")}>
            {isMarqueAutre ? (
              <input
                required
                value={form.modele}
                onChange={(e) => setForm({ ...form, modele: e.target.value })}
                placeholder="Saisir le modèle"
                className="input"
              />
            ) : (
              <>
                <Dropdown
                  value={modeleSel}
                  onChange={(v) => {
                    setModeleSel(v);
                    if (v === "__autre__") {
                      setForm({ ...form, modele: "" });
                    } else {
                      setForm({ ...form, modele: v });
                    }
                  }}
                  placeholder={marqueSel ? "— Choisir un modèle —" : "Choisir une marque d'abord"}
                  ariaLabel="Modèle"
                  name="modele"
                  required
                  options={[
                    ...modelOptions.map((m) => ({ value: m, label: m })),
                    { value: "__autre__", label: "Autre" },
                  ]}
                />
                {isModeleAutre && (
                  <input
                    required
                    value={form.modele}
                    onChange={(e) => setForm({ ...form, modele: e.target.value })}
                    placeholder="Saisir le modèle"
                    className="input mt-2"
                  />
                )}
              </>
            )}
          </Field>
          <Field label="Finition"><input value={form.finition} onChange={(e) => setForm({ ...form, finition: e.target.value })} className="input" /></Field>
          <Field label="Transmission" locked={isLocked("transmission")}>
            <Dropdown
              value={form.transmission}
              onChange={(v) => setForm({ ...form, transmission: v as typeof form.transmission })}
              ariaLabel="Transmission"
              name="transmission"
              options={[
                { value: "manuelle", label: "Manuelle" },
                { value: "automatique", label: "Automatique" },
              ]}
            />
          </Field>
          <Field label="Carburant" locked={isLocked("carburant")}>
            <Dropdown
              value={form.carburant}
              onChange={(v) => setForm({ ...form, carburant: v as typeof form.carburant })}
              ariaLabel="Carburant"
              name="carburant"
              options={[
                { value: "essence", label: "Essence" },
                { value: "diesel", label: "Diesel" },
                { value: "essence_hybride", label: "Essence hybride" },
                { value: "diesel_hybride", label: "Diesel hybride" },
                { value: "electrique", label: "Électrique" },
              ]}
            />
          </Field>
          <Field label="MEC (Mise En Circulation)" locked={isLocked("annee")}><input type="number" value={form.annee} onChange={(e) => setForm({ ...form, annee: +e.target.value })} className="input" /></Field>
          <Field label="Kilométrage" locked={isLocked("kilometrage")}><input type="number" value={form.kilometrage} onChange={(e) => setForm({ ...form, kilometrage: +e.target.value })} className="input" /></Field>

          <div className="sm:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary">Zone prix (interne)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prix plancher (MAD)"><input type="number" min={0} step={1000} value={form.prixPlancher} onChange={(e) => setForm({ ...form, prixPlancher: +e.target.value })} className="input" /></Field>
              <Field label="Prix minimum (MAD)"><input type="number" min={0} step={1000} value={form.prixMinimum} onChange={(e) => setForm({ ...form, prixMinimum: +e.target.value })} className="input" /></Field>
            </div>
          </div>
          <Field label="Couleur extérieure" locked={isLocked("couleurExterieur")}><input value={form.couleurExterieur} onChange={(e) => setForm({ ...form, couleurExterieur: e.target.value })} className="input" /></Field>
          <Field label="Couleur intérieure" locked={isLocked("couleurInterieur")}><input value={form.couleurInterieur} onChange={(e) => setForm({ ...form, couleurInterieur: e.target.value })} className="input" /></Field>

          <Field label="Nombre de clés"><input type="number" min={0} value={form.nombreCles} onChange={(e) => setForm({ ...form, nombreCles: +e.target.value })} className="input" /></Field>
          <Field label="Puissance fiscale (CV)"><input type="number" min={1} value={form.puissanceFiscale} onChange={(e) => setForm({ ...form, puissanceFiscale: +e.target.value })} className="input" /></Field>
          <Field label="Opposition">
            <Dropdown
              value={form.opposition ? "oui" : "non"}
              onChange={(v) => setForm({ ...form, opposition: v === "oui" })}
              ariaLabel="Opposition"
              name="opposition"
              options={yesNo}
            />
          </Field>
          <Field label="Main levée">
            <Dropdown
              value={form.mainLevee ? "oui" : "non"}
              onChange={(v) => setForm({ ...form, mainLevee: v === "oui" })}
              ariaLabel="Main levée"
              name="mainLevee"
              options={yesNo}
            />
          </Field>
          <Field label="Carte grise barrée">
            <Dropdown
              value={form.carteGriseBarree ? "oui" : "non"}
              onChange={(v) => setForm({ ...form, carteGriseBarree: v === "oui" })}
              ariaLabel="Carte grise barrée"
              name="carteGriseBarree"
              options={yesNo}
            />
          </Field>
          <Field label="Procuration">
            <Dropdown
              value={form.procuration}
              onChange={(v) => setForm({ ...form, procuration: v as typeof form.procuration })}
              ariaLabel="Procuration"
              name="procuration"
              options={[
                { value: "procuration", label: "Procuration" },
                { value: "carton_ouvert", label: "Carton ouvert" },
                { value: "carton_ferme", label: "Carton fermé" },
              ]}
            />
          </Field>
          <div className="sm:col-span-2 mt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">Annuler</button>
            <button disabled={saving} type="submit" className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving ? (isEdit ? "Enregistrement…" : "Création…") : isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
        <style>{`.input{height:36px;width:100%;border-radius:6px;border:1px solid var(--color-input);background:var(--color-background);padding:0 12px;font-size:14px;}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children, locked }: { label: string; children: React.ReactNode; locked?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {label}
        {locked && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
            <Lock className="h-2.5 w-2.5" /> Expert
          </span>
        )}
      </span>
      {locked ? (
        <fieldset disabled className="opacity-70 pointer-events-none">{children}</fieldset>
      ) : (
        children
      )}
    </label>
  );
}

type ExpertReportInfo = {
  status: string;
  assigneLe: string | null;
  rapportRecuLe: string | null;
  noteFinale: number | null;
  expertNom: string | null;
};

function CarPreviewDialog({
  car,
  onClose,
  onEdit,
  onDelete,
}: {
  car: CarRow;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [report, setReport] = useState<ExpertReportInfo | null>(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);

  // Commercial photos are public — no round-trip needed, just a stable URL.
  const images = (car.images && car.images.length > 0 ? car.images : []).map(resolveCarImageUrl);
  const expertImages = car.expertImages && car.expertImages.length > 0 ? car.expertImages : [];
  const [expertImgIdx, setExpertImgIdx] = useState(0);

  // Expertise photos are private — resolve each to a signed URL for this session.
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    if (expertImages.length === 0) return;
    void Promise.all(
      expertImages.map(async (path) => {
        try {
          const url = await storage.signedUrl("car-images", path);
          return [path, url] as const;
        } catch {
          return [path, ""] as const;
        }
      }),
    ).then((pairs) => {
      if (cancelled) return;
      setPreviews(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingReport(true);
      const { data } = await supabase
        .from("expert_assignments")
        .select("status, assigne_le, rapport_recu_le, note_finale, expert_id")
        .eq("car_id", car.id)
        .order("assigne_le", { ascending: false, nullsFirst: false })
        .limit(1);
      const row = data?.[0];
      if (!row) {
        if (!cancelled) { setReport(null); setLoadingReport(false); }
        return;
      }
      let expertNom: string | null = null;
      if (row.expert_id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("nom")
          .eq("user_id", row.expert_id)
          .maybeSingle();
        expertNom = prof?.nom ?? null;
      }
      if (!cancelled) {
        setReport({
          status: row.status as string,
          assigneLe: row.assigne_le as string | null,
          rapportRecuLe: row.rapport_recu_le as string | null,
          noteFinale: (row.note_finale as number) ?? null,
          expertNom,
        });
        setLoadingReport(false);
      }
    })();
    return () => { cancelled = true; };
  }, [car.id]);

  const expertValidated = report?.status === "rapport_recu";

  const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 border-b border-border py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground break-words">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-mono">#{car.id}</span> · Vendeur : {car.vendeurNom}
            </p>
            <h3 className="truncate text-base font-semibold text-foreground sm:text-lg">
              {car.marque} {car.modele} {car.finition && <span className="text-muted-foreground">· {car.finition}</span>}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={car.status} />
            <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Fermer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-2">
          {/* Gallery */}
          <div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[imgIdx]}
                    alt={`${car.marque} ${car.modele} ${imgIdx + 1}/${images.length}`}
                    className="h-full w-full object-cover"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setImgIdx((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        aria-label="Précédent"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setImgIdx((i) => (i + 1) % images.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        aria-label="Suivant"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        {imgIdx + 1} / {images.length}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Aucune image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {images.slice(0, 10).map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${i === imgIdx ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"}`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Véhicule</h4>
              <InfoRow label="Marque" value={car.marque} />
              <InfoRow label="Modèle" value={car.modele} />
              <InfoRow label="Finition" value={car.finition || "—"} />
              <InfoRow label="Carrosserie" value={car.bodyType || "—"} />
              <InfoRow label="MEC" value={car.annee} />
              <InfoRow label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
              <InfoRow label="Transmission" value={car.transmission} />
              <InfoRow label="Carburant" value={car.carburant} />
              <InfoRow label="Puissance fiscale" value={`${car.puissanceFiscale} CV`} />
              <InfoRow label="Couleur ext." value={car.couleurExterieur} />
              <InfoRow label="Couleur int." value={car.couleurInterieur} />
            </section>

            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Administratif</h4>
              <InfoRow label="Type vendeur" value={car.type} />
              <InfoRow label="Nombre de clés" value={car.nombreCles} />
              <InfoRow label="Opposition" value={car.opposition ? "Oui" : "Non"} />
              <InfoRow label="Main levée" value={car.mainLevee ? "Oui" : "Non"} />
              <InfoRow label="Carte grise barrée" value={car.carteGriseBarree ? "Oui" : "Non"} />
              <InfoRow label="Procuration" value={car.procuration} />
            </section>

            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prix (interne)</h4>
              <InfoRow label="Prix plancher" value={formatMad(car.prixPlancher)} />
              <InfoRow label="Prix minimum" value={car.prixMinimum != null ? formatMad(car.prixMinimum) : "—"} />
            </section>
          </div>

          {/* Expert report — full width */}
          <div className="md:col-span-2">
            <div className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Rapport d'expertise
                </h4>
                {expertValidated && (
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Validé — verrouillé
                  </span>
                )}
              </div>
              {loadingReport ? (
                <p className="text-sm text-muted-foreground">Chargement…</p>
              ) : !report ? (
                <p className="text-sm text-muted-foreground">Aucun expert n'a encore été assigné à cette voiture.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <InfoRow label="Expert" value={report.expertNom || "—"} />
                    <InfoRow label="Statut" value={report.status === "rapport_recu" ? "Rapport reçu" : "En inspection"} />
                    <InfoRow label="Assigné le" value={report.assigneLe ? new Date(report.assigneLe).toLocaleDateString("fr-MA") : "—"} />
                    <InfoRow label="Rapport reçu le" value={report.rapportRecuLe ? new Date(report.rapportRecuLe).toLocaleDateString("fr-MA") : "—"} />
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-lg bg-background p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Note finale</p>
                    <p className="mt-1 text-4xl font-bold text-foreground">
                      {report.noteFinale != null ? report.noteFinale : car.noteExpert ?? "—"}
                      <span className="text-lg text-muted-foreground">/10</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Expert photos — admin-only */}
          <div className="md:col-span-2">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-600" />
                <h4 className="text-sm font-semibold text-foreground">Photos d'expertise</h4>
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Admin uniquement
                </span>
                {expertImages.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{expertImages.length} photo{expertImages.length > 1 ? "s" : ""}</span>
                )}
              </div>
              {expertImages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune photo d'expertise soumise par l'expert.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-secondary">
                    <img
                      src={previews[expertImages[expertImgIdx]]}
                      alt={`Expertise ${expertImgIdx + 1}/${expertImages.length}`}
                      className="h-full w-full object-cover"
                    />
                    {expertImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setExpertImgIdx((i) => (i - 1 + expertImages.length) % expertImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                          aria-label="Précédent"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setExpertImgIdx((i) => (i + 1) % expertImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                          aria-label="Suivant"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                          {expertImgIdx + 1} / {expertImages.length}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-2">
                    {expertImages.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setExpertImgIdx(i)}
                        className={`aspect-square overflow-hidden rounded-md border-2 transition-colors ${i === expertImgIdx ? "border-accent" : "border-transparent opacity-70 hover:opacity-100"}`}
                      >
                        <img src={previews[src]} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:flex-row sm:justify-between sm:px-6">
          <button
            onClick={onDelete}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-secondary"
            >
              Fermer
            </button>
            <button
              onClick={onEdit}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              <Pencil className="h-4 w-4" /> Modifier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


