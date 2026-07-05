import { publicUrl } from "@/lib/storage/paths";

/**
 * `cars.images` holds real storage paths (e.g. "cars/154/commercial/uuid.jpg")
 * uploaded by the expert — never a random stock substitute. Resolve to a
 * stable public URL for display.
 */
export function resolveCarImageUrl(src: string): string {
  return /^cars\//.test(src) ? publicUrl("car-images", src) : src;
}
