import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Deliberately separate from vite.config.ts's @lovable.dev/vite-tanstack-config
// wrapper — that pulls in the full TanStack Start/nitro SSR pipeline, which
// unit tests (pure functions + isolated component rendering) don't need and
// which would slow every test run down for no benefit.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
