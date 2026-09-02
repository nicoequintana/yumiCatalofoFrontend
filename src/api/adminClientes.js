/**
 * REST client del resumen de clientes del panel admin
 * (`/api/admin/clientes-resumen`).
 *
 * El endpoint está detrás del `router.use(requireAuth)` de `admin.routes.js`,
 * así que va por `fetchAutenticado` (adjunta el JWT y, ante un 401, limpia el
 * token y manda al login) — mismo patrón que `adminVentas.js`.
 *
 * Los montos vienen del backend como string entero, sin decimales (no como
 * number): son valores `Decimal` de Prisma y se serializan como string a
 * propósito para no perder precisión al pasar por JSON. Se formatean para
 * mostrar con `formatPrecio` de `utils/formato.js`.
 *
 * `tiempoEntreCompras` puede venir `null` — significa "todavía no hay
 * recompras que medir", no cero días. Se pasa tal cual, sin normalizar a 0:
 * la página lo distingue y muestra "sin datos suficientes".
 */

import { fetchAutenticado } from "./authClient.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/** Igual que el `pedir` del resto de los clientes, pero autenticado. */
async function pedirAutenticado(url, options) {
  const res = await fetchAutenticado(url, options);

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/** Arma el querystring salteando valores vacíos/nulos. */
function construirQuery(filtros) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== null && valor !== "") params.set(clave, valor);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/**
 * Resumen de clientes del período (nuevos vs. recurrentes, valor por cliente,
 * ranking y recompra). Sin filtros, el backend usa los últimos 30 días.
 *
 * @param {{desde?: string, hasta?: string}} filtros - fechas en formato
 *   "YYYY-MM-DD".
 * @returns {Promise<object>} resumen de clientes
 */
export async function getResumenClientes(filtros = {}) {
  const { desde, hasta, dias } = filtros;
  // `dias` es el contrato que usa la UI: manda la intención ("últimos 30 días")
  // y el rango lo resuelve el backend, que es la única fuente del calendario
  // argentino. `desde`/`hasta` siguen aceptados para pedidos armados a mano.
  return pedirAutenticado(`${BASE}/admin/clientes-resumen${construirQuery({ desde, hasta, dias })}`);
}
