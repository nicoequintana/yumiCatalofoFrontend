import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    // Los tests E2E de Playwright viven en /e2e y corren con `playwright
    // test`, no con Vitest — sin este exclude, Vitest los recogería también
    // (mismo patrón *.spec.js) e intentaría correrlos en jsdom, donde
    // `@playwright/test` no funciona. Se repiten acá los defaults propios de
    // Vitest (node_modules/dist/etc.) porque especificar `exclude` pisa el
    // array default entero en vez de extenderlo.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/e2e/**",
    ],
  },
});
