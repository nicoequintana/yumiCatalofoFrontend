/**
 * REST client del embudo de conversión global del panel admin
 * (`/api/admin/embudo`).
 *
 * El endpoint está detrás del `router.use(requireAuth)` de `admin.routes.js`,
 * así que va por `fetchAutenticado` (adjunta el JWT y, ante un 401, limpia el
 * token y manda al login) — mismo patrón que `adminVentas.js`.
 *
 * La respuesta trae, además de los conteos por etapa, los metadatos de
 * confiabilidad del dato (`confiableDesde`, `periodoConfiable`, y por etapa
 * `registraDesde`/`subregistrada`): los emisores de eventos se cablearon en
 * momentos distintos, así que comparar etapas fuera de la ventana confiable
 * da tasas que no significan nada. La pantalla los usa para avisarlo.
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
 * Embudo de conversión del período (etapas, tasas, confiabilidad del dato y
 * fuentes de tráfico). Sin filtros, el backend usa los últimos 30 días.
 *
 * @param {{desde?: string, hasta?: string}} filtros - fechas en formato
 *   "YYYY-MM-DD".
 * @returns {Promise<object>} embudo de conversión
 */
export async function getEmbudoConversion(filtros = {}) {
  const { desde, hasta } = filtros;
  return pedirAutenticado(`${BASE}/admin/embudo${construirQuery({ desde, hasta })}`);
}
