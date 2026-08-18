import { defineConfig, devices } from "@playwright/test";

/**
 * Config de Playwright para los tests E2E (Sprint 7, Task 1).
 *
 * Decisión de orquestación de procesos (documentada, ver también el README
 * de `e2e/`): Playwright's `webServer` solo puede levantar UN proceso
 * directamente vía `command`. Este proyecto necesita DOS servidores vivos
 * (frontend Vite + backend Express/Prisma contra SQL Server real) para que
 * un test E2E tenga algo real que ejercitar de punta a punta.
 *
 * Se evaluó envolver ambos arranques en un script wrapper (ej. `concurrently`
 * o un `.js` custom que spawnee los dos procesos), pero se descartó por
 * sobre-ingeniería para un proyecto de este tamaño: el backend necesita una
 * conexión real a SQL Server (`DATABASE_URL`) que YA tiene que estar
 * corriendo en desarrollo de todos modos (es el mismo contenedor Docker que
 * usa el resto del equipo día a día) — no hay nada que "levantar desde cero"
 * de forma limpia ahí, a diferencia del frontend (un dev server stateless).
 *
 * Solución elegida: `webServer` acá SOLO levanta el frontend (`npm run dev`
 * en este mismo directorio). El backend se asume YA CORRIENDO por separado
 * (`node --watch src/server.js` en `backend/`, con `.env`/`DATABASE_URL`
 * configurado) antes de correr `npm run test:e2e`. Ver el README de `e2e/`
 * para el paso a paso. Si el backend no está arriba, los tests van a fallar
 * rápido y con un error de conexión claro (fetch failed / ECONNREFUSED)
 * contra `http://localhost:4000`, no un timeout silencioso.
 */
export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.js",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // Levanta el frontend automáticamente. El backend NO se levanta acá — ver
  // el comentario de arriba y `e2e/README.md`.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
