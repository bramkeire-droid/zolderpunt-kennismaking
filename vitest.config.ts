import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Serverfuncties (Deno) importeren met "npm:"; in tests wijzen we die naar het gewone pakket.
      "npm:@supabase/supabase-js@2": "@supabase/supabase-js",
      "npm:@anthropic-ai/sdk@1": "@anthropic-ai/sdk",
    },
  },
});
