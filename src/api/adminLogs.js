/**
 * REST client para los dos feeds de logs del panel admin
 * (`/api/admin/audit-logs` y `/api/admin/error-logs`).
 *
 * Ambos endpoints están detrás del `router.use(requireAuth)` de
 * `admin.routes.js`, así que las dos funciones van por `fetchAutenticado`
 * (adjunta el JWT y, ante un 401, limpia el token y manda al login).
 *
 * Los dos comparten el mismo shape de respuesta paginada
 * (`{ data, page, pageSize, total }`), por eso `AdminLogs.jsx` puede usar la
 * misma lógica de paginación para las dos pestañas.
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
 * Traza de auditoría paginada (quién hizo qué mutación y cuándo).
 * @param {{entidad?: string, page?: number, pageSize?: number}} filtros
 * @returns {Promise<{data: Array, page: number, pageSize: number, total: number}>}
 */
export async function getAuditLogs(filtros = {}) {
  const { entidad, page, pageSize } = filtros;
  return pedirAutenticado(`${BASE}/admin/audit-logs${construirQuery({ entidad, page, pageSize })}`);
}

/**
 * Log central de errores técnicos, paginado.
 * @param {{page?: number, pageSize?: number}} filtros
 * @returns {Promise<{data: Array, page: number, pageSize: number, total: number}>}
 */
export async function getErrorLogs(filtros = {}) {
  const { page, pageSize } = filtros;
  return pedirAutenticado(`${BASE}/admin/error-logs${construirQuery({ page, pageSize })}`);
}
