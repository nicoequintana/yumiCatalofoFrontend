/**
 * Global setup de Playwright (ver `globalSetup` en `playwright.config.js`).
 *
 * Pre-flight check de salud del backend: el backend NO se auto-levanta (ver
 * el comentario de `playwright.config.js` / `e2e/README.md`), así que si
 * alguien corre `npm run test:e2e` sin haber levantado `backend` a mano, el
 * fallo real ocurre recién en medio del primer test — como un timeout de
 * Playwright esperando un elemento que nunca aparece porque el fetch de
 * datos falló silenciosamente. Este chequeo falla ANTES, con un mensaje que
 * dice exactamente qué falta, en vez de un timeout genérico y confuso.
 */
const BACKEND_URL = "http://localhost:4000";

export default async function globalSetup() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) {
      throw new Error(`respondió HTTP ${res.status}`);
    }
  } catch (err) {
    throw new Error(
      `[e2e] El backend no responde en ${BACKEND_URL}/health (${err.message}). ` +
        `Los tests E2E necesitan el backend corriendo aparte — levantalo con ` +
        `"npm run dev" en backend/ antes de correr "npm run test:e2e". Ver e2e/README.md.`,
    );
  }
}
