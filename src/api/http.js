/**
 * Timeout compartido para todos los fetch de `src/api`.
 *
 * Ningún `.catch` de las pantallas cubre una conexión que CUELGA sin
 * responder (distinto de rechazar): sin esto, el spinner queda girando hasta
 * el timeout del navegador, que son minutos. Este helper corta la request y
 * rechaza con un mensaje legible en vez de un `AbortError` crudo.
 *
 * Dos valores, no uno:
 * - `TIMEOUT_REQUEST_MS` (15 s): cualquier request JSON común. Holgado hasta
 *   para una conexión móvil lenta, pero muy por debajo de los minutos del
 *   default del navegador.
 * - `TIMEOUT_SUBIDA_MS` (120 s): subidas de media (hasta 10 fotos + video en
 *   `products.js`) y la importación de `.xlsx` — archivos grandes sobre un
 *   uplink lento necesitan más margen que un GET.
 */

export const TIMEOUT_REQUEST_MS = 15_000;
export const TIMEOUT_SUBIDA_MS = 120_000;

export const MENSAJE_TIMEOUT =
  "El servidor está tardando demasiado en responder. Revisá tu conexión e intentá de nuevo.";

/**
 * `fetch` con timeout. Aborta la request cuando vence `timeoutMs` y rechaza
 * con un `Error` de mensaje legible (nunca un `AbortError` crudo — los call
 * sites hacen `setError(err.message)` y ese texto llega tal cual a la
 * pantalla).
 *
 * El rechazo por timeout NO depende de que el `fetch` subyacente honre la
 * señal: el listener de `abort` rechaza por su cuenta, así que hasta un fetch
 * colgado que ignora la señal (o un mock de test) queda cubierto.
 *
 * Pisa `options.signal` a propósito: hoy ningún call site pasa una señal
 * propia, y componer señales acá sería complejidad sin consumidor.
 *
 * @param {string} url
 * @param {object} [options] opciones de fetch (sin `signal` propio)
 * @param {number} [timeoutMs] `TIMEOUT_REQUEST_MS` salvo subidas de archivos
 * @returns {Promise<Response>}
 */
export function fetchConTimeout(url, options = {}, timeoutMs = TIMEOUT_REQUEST_MS) {
  const controlador = new AbortController();
  const timer = setTimeout(() => controlador.abort(), timeoutMs);

  return new Promise((resolve, reject) => {
    controlador.signal.addEventListener("abort", () => reject(new Error(MENSAJE_TIMEOUT)), {
      once: true,
    });

    fetch(url, { ...options, signal: controlador.signal }).then(resolve, (err) => {
      // El fetch real rechaza con AbortError al abortarse la señal; se
      // traduce al mismo mensaje para que ninguna rama filtre el nombre
      // técnico a la UI.
      reject(err?.name === "AbortError" ? new Error(MENSAJE_TIMEOUT) : err);
    });
  }).finally(() => {
    clearTimeout(timer);
  });
}
