/**
 * REST client del tablero operativo del panel admin (`/api/admin/operacion`).
 *
 * El endpoint está detrás del `router.use(requireAuth)` de `admin.routes.js`,
 * así que va por `fetchAutenticado` (adjunta el JWT y, ante un 401, limpia el
 * token y manda al login) — mismo patrón que `adminVentas.js`.
 *
 * Los totales de las órdenes estancadas vienen como string con dos decimales
 * (valores `Decimal` de Prisma, serializados así para no perder precisión al
 * pasar por JSON) y se muestran con `formatPrecio` de `utils/formato.js`.
 */

import { fetchAutenticado } from "./authClient.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/** Igual que el `pedir` del resto de los clientes, pero autenticado. */
async function pedirAutenticado(url, options) {
  const res = await fetchAutenticado(url, options);

  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

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
 * Tablero operativo del período: órdenes por estado, órdenes estancadas,
 * antigüedad sin cambios y alertas de stock. Sin filtros, el backend usa los
 * últimos 30 días.
 *
 * @param {{desde?: string, hasta?: string}} filtros - fechas en formato
 *   "YYYY-MM-DD".
 * @returns {Promise<object>} resumen de operación
 */
export async function getResumenOperacion(filtros = {}) {
  const { desde, hasta } = filtros;
  return pedirAutenticado(`${BASE}/admin/operacion${construirQuery({ desde, hasta })}`);
}
