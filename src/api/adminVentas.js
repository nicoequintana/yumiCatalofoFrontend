/**
 * REST client del resumen de ventas del panel admin (`/api/admin/ventas`).
 *
 * El endpoint está detrás del `router.use(requireAuth)` de `admin.routes.js`,
 * así que va por `fetchAutenticado` (adjunta el JWT y, ante un 401, limpia el
 * token y manda al login) — mismo patrón que `adminLogs.js`.
 *
 * Los montos vienen del backend como string entero, sin decimales (no como
 * number): son valores `Decimal` de Prisma y se serializan como string a
 * propósito para no perder precisión al pasar por JSON. Se formatean para
 * mostrar con `formatPrecio` de `utils/formato.js`.
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
 * Resumen de facturación del período (ingresos, pipeline, ranking y serie
 * diaria). Sin filtros, el backend usa los últimos 30 días.
 *
 * @param {{desde?: string, hasta?: string}} filtros - fechas en formato
 *   "YYYY-MM-DD".
 * @returns {Promise<object>} resumen de ventas
 */
export async function getResumenVentas(filtros = {}) {
  const { desde, hasta } = filtros;
  return pedirAutenticado(`${BASE}/admin/ventas${construirQuery({ desde, hasta })}`);
}
