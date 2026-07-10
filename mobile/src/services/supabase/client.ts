/**
 * Supabase client — mirrors webapp/src/integrations/supabase/client.ts,
 * swapping localStorage for the encrypted largeSecureStore adapter (see
 * ./largeSecureStore.ts) and Vite env vars for Expo's EXPO_PUBLIC_* vars.
 */
import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { env } from "@/config/env";
import { largeSecureStore } from "./largeSecureStore";
import type { Database } from "./database.types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  global: {
    fetch: createSupabaseFetch(env.SUPABASE_ANON_KEY),
  },
  auth: {
    storage: largeSecureStore,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// The Supabase JS SDK's auto-refresh timer only ticks while something calls
// startAutoRefresh(); on RN that has to be driven by app foreground/background
// transitions explicitly (there's no browser tab-visibility event to hook).
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    void supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
