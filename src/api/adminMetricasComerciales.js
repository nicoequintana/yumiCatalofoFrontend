/**
 * REST client de las métricas comerciales de campañas y promociones
 * (`/api/admin/metricas-comerciales`).
 *
 * Detrás del `router.use(requireAuth)` de `admin.routes.js`, así que va por
 * `fetchAutenticado`, mismo patrón que `adminEmbudo.js`.
 *
 * ⚠️ Los dos helpers de abajo están duplicados a propósito en los cinco
 * clientes de analytics. Unificarlos amerita, pero es su propio cambio: acá
 * sería el sexto, y mezclarlo con una feature esconde el refactor adentro de
 * un diff que nadie va a revisar con esa lente.
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
 * Métricas comerciales de campañas y promociones del período.
 *
 * @param {{estado?: string}} filtros - estado para filtrar
 *   (`PROGRAMADA`, `ACTIVA`, `FINALIZADA`).
 * @returns {Promise<object>} métricas comerciales con registraDesde, truncado,
 *   etapasEnRango, origenes e items
 */
export async function getMetricasComerciales(filtros = {}) {
  return pedirAutenticado(`${BASE}/admin/metricas-comerciales${construirQuery(filtros)}`);
}
