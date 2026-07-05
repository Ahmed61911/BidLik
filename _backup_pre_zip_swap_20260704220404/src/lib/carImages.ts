/**
 * Static car image library, grouped by brand.
 * Imported via Vite's import.meta.glob for automatic bundling + hashing.
 */

const modules = import.meta.glob("/src/assets/cars/*/*.jpg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const byBrand: Record<string, string[]> = {};
for (const [path, url] of Object.entries(modules)) {
  // path like /src/assets/cars/bmw/bmw_3.jpg
  const match = path.match(/\/cars\/([^/]+)\//);
  if (!match) continue;
  const brand = match[1];
  (byBrand[brand] ??= []).push(url);
}

// Sort each brand's images by filename for deterministic order.
for (const brand of Object.keys(byBrand)) {
  byBrand[brand].sort();
}

const aliases: Record<string, string> = {
  "mercedes-benz": "mercedes",
  mercedesbenz: "mercedes",
  vw: "renault", // fallback
  volkswagen: "renault",
  hyundai: "peugeot",
};

export function getCarImages(marque: string): string[] {
  const key = marque.toLowerCase().replace(/\s+/g, "-");
  if (byBrand[key]) return byBrand[key];
  const alias = aliases[key];
  if (alias && byBrand[alias]) return byBrand[alias];
  // fallback: first available brand
  const first = Object.values(byBrand)[0];
  return first ?? [];
}
