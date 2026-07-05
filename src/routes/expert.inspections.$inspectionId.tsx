import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabaseExpertApi } from "@/lib/supabaseExpertApi";
import { storage, carPaths } from "@/lib/storage";
import { BODY_TYPES } from "@/types/auction";
import type { ExpertInspection, InspectionChecklist, CarDetailsEdit } from "@/types/expert";

export const Route = createFileRoute("/expert/inspections/$inspectionId")({
  component: ExpertInspectionDetailPage,
});

const initialChecklist: InspectionChecklist = {
  carrosserie: 7,
  moteur: 7,
  interieur: 7,
  pneus: 7,
  electronique: 7,
  documents: true,
};

const CRITERIA: { key: keyof Omit<InspectionChecklist, "documents">; label: string }[] = [
  { key: "carrosserie", label: "Carrosserie" },
  { key: "moteur", label: "Moteur & boîte" },
  { key: "interieur", label: "Intérieur" },
  { key: "pneus", label: "Pneus & freins" },
  { key: "electronique", label: "Électronique" },
];

function ExpertInspectionDetailPage() {
  const { inspectionId } = Route.useParams();
  const navigate = useNavigate();
  const [insp, setInsp] = useState<ExpertInspection | null>(null);
  const [checklist, setChecklist] = useState<InspectionChecklist>(initialChecklist);
  const [comment, setComment] = useState("");
  const [noteOverride, setNoteOverride] = useState<number | null>(null);
  const [details, setDetails] = useState<CarDetailsEdit | null>(null);
  const [detailsConfirmes, setDetailsConfirmes] = useState(false);
  // `images`/`commercialImages` hold storage paths (not data URLs) once uploaded;
  // `*Previews` maps each path to a signed URL for display in this session.
  const [images, setImages] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({});
  const [commercialImages, setCommercialImages] = useState<string[]>([]);
  const [commercialPreviews, setCommercialPreviews] = useState<Record<string, string>>({});
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfPath, setPdfPath] = useState<string | null>(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingCommercial, setUploadingCommercial] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const commercialImgInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabaseExpertApi.getInspection(inspectionId).then(async (i) => {
      setInsp(i);
      // Pre-fill from the car's real current data — never placeholders —
      // so what the expert sees matches what admin/vendeur actually entered.
      setDetails(i.carDetails);

      // Once a report has been submitted, hydrate every field from it so
      // this same page also serves as the full past-report view (reachable
      // from /expert/historique): checklist, comment, note override, both
      // photo sets (with resolved preview URLs), and the report PDF.
      if (i.stage === "rapport_recu") {
        setDetailsConfirmes(true);
        if (i.checklist) setChecklist(i.checklist);
        if (i.commentaire) setComment(i.commentaire);
        if (i.noteFinale != null) setNoteOverride(i.noteFinale);
        if (i.rapportPath) {
          setPdfPath(i.rapportPath);
          setPdfName(i.rapportName);
        }
        setImages(i.images);
        setCommercialImages(i.commercialImages);
        const allPaths = [...i.images, ...i.commercialImages];
        if (allPaths.length > 0) {
          const pairs = await Promise.all(
            allPaths.map(async (path) => {
              try {
                return [path, await storage.signedUrl("car-images", path)] as const;
              } catch {
                return [path, ""] as const;
              }
            }),
          );
          const urlByPath = Object.fromEntries(pairs);
          setImagePreviews(Object.fromEntries(i.images.map((p) => [p, urlByPath[p]])));
          setCommercialPreviews(Object.fromEntries(i.commercialImages.map((p) => [p, urlByPath[p]])));
        }
      }
    }).catch(() => setInsp(null));
  }, [inspectionId]);

  const computedNote = useMemo(() => supabaseExpertApi.computeNote(checklist), [checklist]);
  const note = noteOverride ?? computedNote;
  const readonly = insp?.stage === "rapport_recu";

  const onImagesPicked = async (files: FileList | null) => {
    if (!files || !insp) return;
    const arr = Array.from(files);
    setUploadingImages(true);
    try {
      for (const file of arr) {
        const uploaded = await storage.uploadFile({
          file,
          bucket: "car-images",
          category: "expertise",
          carId: insp.carId,
          buildPath: (ext) => carPaths.expertisePhoto(insp.carId, ext),
        });
        const previewUrl = await storage.signedUrl("car-images", uploaded.path);
        setImages((prev) => [...prev, uploaded.path]);
        setImagePreviews((prev) => ({ ...prev, [uploaded.path]: previewUrl }));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingImages(false);
    }
  };

  const onCommercialImagesPicked = async (files: FileList | null) => {
    if (!files || !insp) return;
    const arr = Array.from(files).slice(0, 8 - commercialImages.length);
    setUploadingCommercial(true);
    try {
      for (const file of arr) {
        const uploaded = await storage.uploadFile({
          file,
          bucket: "car-images",
          category: "commercial",
          carId: insp.carId,
          buildPath: (ext) => carPaths.commercial(insp.carId, ext),
        });
        const previewUrl = await storage.signedUrl("car-images", uploaded.path);
        setCommercialImages((prev) => [...prev, uploaded.path]);
        setCommercialPreviews((prev) => ({ ...prev, [uploaded.path]: previewUrl }));
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingCommercial(false);
    }
  };

  const removeImage = (path: string) => {
    setImages((prev) => prev.filter((p) => p !== path));
    setImagePreviews((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    void storage.remove("car-images", [path]);
  };

  const removeCommercialImage = (path: string) => {
    setCommercialImages((prev) => prev.filter((p) => p !== path));
    setCommercialPreviews((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
    void storage.remove("car-images", [path]);
  };

  const submit = async () => {
    if (!insp || !details) return;
    if (!detailsConfirmes) {
      toast.error("Confirmez les détails de la voiture avant de soumettre.");
      return;
    }
    setSubmitting(true);
    try {
      await supabaseExpertApi.submitReport({
        inspectionId: insp.id,
        checklist,
        noteFinale: note,
        commentaire: comment,
        carDetails: details,
        detailsConfirmes,
        images,
        commercialImages,
        rapportPdfNom: pdfName,
        rapportPath: pdfPath,
      });
      toast.success(`Rapport envoyé — note ${note}/10`);
      navigate({ to: "/expert/inspections" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!insp || !details) {
    return (
      <div className="rounded-xl border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Chargement de l'inspection…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/expert/inspections" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour
      </Link>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground"><span className="font-mono text-primary">#{insp.carId}</span> — {insp.carLabel}</h2>
          <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs text-foreground">ID: {insp.carId}</span>
          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">Inspection {insp.id}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {insp.vendeurNom} · {insp.ville} · échéance {insp.echeance}
        </p>
      </div>

      {/* Détails de la voiture */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Détails de la voiture</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {([
            ["marque", "Marque", "text"],
            ["modele", "Modèle", "text"],
            ["annee", "MEC (Mise En Circulation)", "number"],
            ["kilometrage", "Kilométrage", "number"],
            ["couleurExterieur", "Couleur extérieure", "text"],
            ["couleurInterieur", "Couleur intérieure", "text"],
          ] as const).map(([key, label, type]) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
              <input
                type={type}
                value={details[key] as string | number}
                disabled={readonly}
                onChange={(e) =>
                  setDetails((d) => d ? { ...d, [key]: type === "number" ? +e.target.value : e.target.value } : d)
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          ))}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type (carrosserie)</label>
            <select
              value={details.bodyType}
              disabled={readonly}
              onChange={(e) => setDetails((d) => d ? { ...d, bodyType: e.target.value } : d)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Choisir —</option>
              {BODY_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Transmission</label>
            <select
              value={details.transmission}
              disabled={readonly}
              onChange={(e) => setDetails((d) => d ? { ...d, transmission: e.target.value } : d)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="manuelle">Manuelle</option>
              <option value="automatique">Automatique</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Carburant</label>
            <select
              value={details.carburant}
              disabled={readonly}
              onChange={(e) => setDetails((d) => d ? { ...d, carburant: e.target.value } : d)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="essence">Essence</option>
              <option value="diesel">Diesel</option>
              <option value="essence_hybride">Essence hybride</option>
              <option value="diesel_hybride">Diesel hybride</option>
              <option value="electrique">Électrique</option>
            </select>
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-md border border-border p-3">
          <input
            type="checkbox"
            checked={detailsConfirmes}
            disabled={readonly}
            onChange={(e) => setDetailsConfirmes(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          <span className="text-sm text-foreground">Je confirme que les détails ci-dessus sont corrects.</span>
        </label>
      </div>

      {/* Photos */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Photos d'inspection <span className="text-xs font-normal text-muted-foreground">({images.length})</span></h3>
          {!readonly && (
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadingImages}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-secondary disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> {uploadingImages ? "Envoi…" : "Ajouter"}
            </button>
          )}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { void onImagesPicked(e.target.files); e.target.value = ""; }}
          />
        </div>
        {images.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune photo ajoutée.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {images.map((path) => (
              <div key={path} className="relative aspect-square overflow-hidden rounded-md border border-border">
                <img src={imagePreviews[path]} alt="" className="h-full w-full object-cover" />
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => removeImage(path)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos commerciales */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Photos commerciales <span className="text-xs font-normal text-muted-foreground">({commercialImages.length}/8)</span></h3>
          {!readonly && (
            <button
              type="button"
              onClick={() => commercialImgInputRef.current?.click()}
              disabled={commercialImages.length >= 8 || uploadingCommercial}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-3.5 w-3.5" /> {uploadingCommercial ? "Envoi…" : "Ajouter"}
            </button>
          )}
          <input
            ref={commercialImgInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { void onCommercialImagesPicked(e.target.files); e.target.value = ""; }}
          />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Photos qui seront affichées dans l'annonce de la voiture (différentes des photos d'inspection).
        </p>
        {commercialImages.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune photo commerciale ajoutée.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {commercialImages.map((path) => (
              <div key={path} className="relative aspect-square overflow-hidden rounded-md border border-border">
                <img src={commercialPreviews[path]} alt="" className="h-full w-full object-cover" />
                {!readonly && (
                  <button
                    type="button"
                    onClick={() => removeCommercialImage(path)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
          <div className="rounded-md bg-secondary px-3 py-1 text-sm font-bold text-foreground">
            Calculée: <span className={computedNote >= 7 ? "text-success" : computedNote >= 5 ? "text-warning-foreground" : "text-destructive"}>{computedNote}/10</span>
          </div>
        </div>

        <div className="space-y-4">
          {CRITERIA.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <span className="text-sm font-semibold text-foreground">{checklist[key]}/10</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={checklist[key]}
                disabled={readonly}
                onChange={(e) => setChecklist((c) => ({ ...c, [key]: +e.target.value }))}
                className="w-full accent-accent"
              />
            </div>
          ))}

          <label className="mt-2 flex items-center gap-2 rounded-md border border-border p-3">
            <input
              type="checkbox"
              checked={checklist.documents}
              disabled={readonly}
              onChange={(e) => setChecklist((c) => ({ ...c, documents: e.target.checked }))}
              className="h-4 w-4 accent-accent"
            />
            <span className="text-sm text-foreground">Documents complets (carte grise, contrôle, factures)</span>
          </label>
        </div>
      </div>

      {/* Note générale */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Note générale</h3>
          <div className="rounded-md bg-accent/10 px-3 py-1 text-base font-bold text-accent">{note}/10</div>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Note calculée automatiquement à partir de la checklist. Vous pouvez l'ajuster si nécessaire.
        </p>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={note}
          disabled={readonly}
          onChange={(e) => setNoteOverride(+e.target.value)}
          className="w-full accent-accent"
        />
        {noteOverride !== null && !readonly && (
          <button
            type="button"
            onClick={() => setNoteOverride(null)}
            className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
          >
            Réinitialiser à la note calculée
          </button>
        )}
      </div>

      {/* PDF */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Rapport PDF</h3>
        <div className="flex items-center gap-3">
          {!readonly && (
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              disabled={uploadingPdf}
              className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              <Upload className="h-4 w-4" /> {uploadingPdf ? "Envoi…" : "Choisir un PDF"}
            </button>
          )}
          <input
            ref={pdfInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f || !insp) { setPdfName(null); setPdfPath(null); return; }
              if (f.size > 8 * 1024 * 1024) {
                toast.error("Le PDF doit faire moins de 8 Mo.");
                return;
              }
              setUploadingPdf(true);
              try {
                const uploaded = await storage.uploadFile({
                  file: f,
                  bucket: "car-images",
                  category: "report",
                  carId: insp.carId,
                  buildPath: (ext) => carPaths.expertiseReport(insp.carId, ext),
                });
                setPdfName(f.name);
                setPdfPath(uploaded.path);
              } catch (err) {
                toast.error((err as Error).message);
              } finally {
                setUploadingPdf(false);
              }
            }}
          />
          {pdfName ? (
            <span className="inline-flex items-center gap-1 text-sm text-foreground">
              <FileText className="h-4 w-4" /> {pdfName}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Aucun fichier sélectionné.</span>
          )}
        </div>
      </div>

      {/* Commentaire */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Commentaire</h3>
        <textarea
          value={comment}
          disabled={readonly}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Observations, défauts, points forts…"
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {!readonly && (
        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            onClick={submit}
            disabled={submitting}
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Envoi…" : `Soumettre le rapport (${note}/10)`}
          </button>
        </div>
      )}
    </div>
  );
}
