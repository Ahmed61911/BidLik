import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { Lightbox } from "@/components/Lightbox";

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
