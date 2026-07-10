/**
 * Central env access. Expo inlines `EXPO_PUBLIC_*` vars at build time (same
 * role as the webapp's `VITE_*` vars) — see mobile/.env.example.
 *
 * `API_URL` points at the *webapp's* deployed origin, since the custom file
 * storage (/api/storage/*) and CMI payment (/api/public/cmi-*) endpoints live
 * on that server, not inside Supabase itself (see architecture plan §1/§3).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy mobile/.env.example to mobile/.env and fill in your deployed Bidlik backend URLs.`,
    );
  }
  return value;
}

export const env = {
  SUPABASE_URL: required("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL),
  SUPABASE_ANON_KEY: required("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  API_URL: required("EXPO_PUBLIC_API_URL", process.env.EXPO_PUBLIC_API_URL),
};
