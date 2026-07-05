import { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  images: string[];
  marque: string;
  modele: string;
}

export function CarGallery({ images, marque, modele }: Props) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="hero-gradient flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl">
        <div className="text-center text-white">
          <span className="text-4xl font-extrabold sm:text-5xl">{marque}</span>
          <span className="mt-1 block text-2xl font-medium text-white/85">{modele}</span>
        </div>
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-secondary">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Agrandir l'image"
          className="absolute inset-0 h-full w-full cursor-zoom-in"
        >
          <img
            src={current}
            alt={`${marque} ${modele} — photo ${active + 1}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </button>
        <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          {active + 1} / {images.length}
        </span>
        <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
          <ZoomIn className="h-3.5 w-3.5" /> Agrandir
        </span>
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-7">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Voir la photo ${i + 1}`}
              className={[
                "relative aspect-[4/3] overflow-hidden rounded-md border-2 transition-all",
                i === active ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
              ].join(" ")}
            >
              <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <Lightbox
          images={images}
          index={active}
          onIndexChange={setActive}
          onClose={() => setOpen(false)}
          alt={`${marque} ${modele}`}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  alt,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  alt: string;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const reset = useCallback(() => { setZoom(1); setOffset({ x: 0, y: 0 }); }, []);

  const next = useCallback(() => { onIndexChange((index + 1) % images.length); reset(); }, [index, images.length, onIndexChange, reset]);
  const prev = useCallback(() => { onIndexChange((index - 1 + images.length) % images.length); reset(); }, [index, images.length, onIndexChange, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.5, 5));
      else if (e.key === "-") setZoom((z) => Math.max(z - 0.5, 1));
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [next, prev, onClose]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(5, Math.max(1, z + (e.deltaY < 0 ? 0.25 : -0.25))));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    setOffset({ x: dragging.current.ox + (e.clientX - dragging.current.x), y: dragging.current.oy + (e.clientY - dragging.current.y) });
  };
  const onPointerUp = () => { dragging.current = null; };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-fade-in">
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur">
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
          aria-label="Zoom arrière"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <span className="min-w-[3ch] text-center text-xs font-semibold text-white">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(5, z + 0.5))}
          aria-label="Zoom avant"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white hover:bg-white/15"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-white/20" />
        <span className="px-2 text-xs font-semibold text-white">{index + 1} / {images.length}</span>
      </div>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Image précédente"
            className="absolute left-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Image suivante"
            className="absolute right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        className="h-full w-full overflow-hidden"
        onWheel={onWheel}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <img
            src={images[index]}
            alt={alt}
            draggable={false}
            onDoubleClick={() => (zoom === 1 ? setZoom(2) : reset())}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? (dragging.current ? "grabbing" : "grab") : "zoom-in",
              transition: dragging.current ? "none" : "transform 0.15s ease-out",
            }}
            className="max-h-[90vh] max-w-[95vw] select-none object-contain"
          />
        </div>
      </div>
    </div>
  );
}
