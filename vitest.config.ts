import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/msw/setup.ts"],
    include: ["tests/unit/**/*.test.ts", "tests/components/**/*.test.tsx"],
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    server: {
      deps: {
        // Force Vitest to bundle zod through its own pipeline (avoids CJS/ESM interop issues)
        inline: ["zod"],
      },
    },
  },
});
