// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // Local filesystem storage (src/lib/storage) needs real Node fs access,
    // which the default cloudflare-module preset doesn't have. This override
    // is ignored inside the Lovable sandbox (forced to Cloudflare there) and
    // only takes effect for our own OVH VPS Docker build — see
    // Dockerfile's "prod" stage and docker-compose.yml's "storage-files" volume.
    preset: "node-server",
  },
});
