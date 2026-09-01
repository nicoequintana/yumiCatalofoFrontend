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
  globalSetup: "./e2e/global-setup.js",
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

  // Dos proyectos: `chromium` (1280x720, la suite de flujo de siempre) y
  // `mobile` (Pixel 7 = 412x915, Chromium con `isMobile`/`hasTouch` — no
  // exige instalar WebKit) para el layout responsive del admin (Sprint del
  // panel admin full responsive, Task 5).
  //
  // El proyecto `mobile` corre UN SOLO spec (`admin-mobile.spec.js`), no la
  // suite entera: los otros 7 specs (6 de flujo — 5 públicos más
  // `admin-cambio-estado.spec.js` — y `admin-desktop-layout.spec.js`) prueban
  // FLUJO/no-regresión de escritorio
  // (checkout, login, cambio de estado de una orden, que la tabla siga siendo
  // `display: table` a 1280px) y eso ya está cubierto contra escritorio —
  // correrlos de nuevo a 412px no agrega cobertura de layout, solo duplica
  // tiempo de corrida y rate limit (login 8/15min, órdenes 10/10min) sin
  // ganar nada. Lo que SÍ es específico de mobile es el layout (desborde,
  // tabla apilada, áreas táctiles, drawer), que es exactamente lo que prueba
  // `admin-mobile.spec.js`.
  //
  // Por eso Playwright NUNCA elige el proyecto solo — cuando hay varios
  // `projects` configurados y no se pasa `--project`, corre TODOS, y con dos
  // proyectos definidos eso incluiría `mobile` en cualquier corrida sin
  // flag. Los dos scripts de `package.json` fijan el proyecto explícito:
  // `npm run test:e2e` = `playwright test --project=chromium` (mismo
  // comportamiento que tenía este comando antes de que existiera el proyecto
  // `mobile`) y `npm run test:e2e:mobile` = `playwright test
  // --project=mobile`. Un `npx playwright test` sin script ni `--project`
  // sigue corriendo los dos proyectos — es el comportamiento por defecto de
  // Playwright, no algo que este archivo pueda apagar por sí solo.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/admin-mobile.spec.js"],
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: ["**/admin-mobile.spec.js"],
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
