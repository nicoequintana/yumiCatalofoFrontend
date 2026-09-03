import { fetchAutenticado } from "./authClient.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * ADMIN → Promociones. **Todo el módulo exige sesión**: no hay ninguna lectura
 * pública acá. Los descuentos que el catálogo necesita ya viajan resueltos en
 * `GET /products`, así que este módulo solo lo consume el panel.
 */
async function pedir(url, opciones) {
  const res = await fetchAutenticado(url, opciones);
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

export async function getPromociones() {
  return pedir(`${BASE}/promociones`);
}

export async function getPromocion(id) {
  return pedir(`${BASE}/promociones/${id}`);
}

export async function crearPromocion(datos) {
  return pedir(`${BASE}/promociones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

export async function actualizarPromocion(id, datos) {
  return pedir(`${BASE}/promociones/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

/**
 * Reemplaza la lista COMPLETA de productos de una promoción.
 *
 * Se manda la lista vigente entera, no un diff: es la forma natural de expresar
 * "quedó así" desde una tabla que se edita completa, y evita tres endpoints
 * (agregar, quitar, cambiar el porcentaje) que después hay que mantener
 * coherentes entre sí.
 */
export async function guardarItemsPromocion(id, items) {
  return pedir(`${BASE}/promociones/${id}/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
}

/**
 * Prende o apaga UN producto dentro de una promoción.
 *
 * Es la resolución de un conflicto: la promoción perdedora queda apagada solo
 * para ese producto y sigue funcionando para todos los demás. **No se reactiva
 * sola** cuando la ganadora termina.
 */
export async function cambiarEstadoItem(id, productId, habilitado) {
  return pedir(`${BASE}/promociones/${id}/items/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habilitado }),
  });
}

export async function eliminarPromocion(id) {
  return pedir(`${BASE}/promociones/${id}`, { method: "DELETE" });
}

/**
 * El listado comercial: cada producto con sus vistas, ventas, conversión,
 * costo, coeficiente, precio y en qué promociones participa.
 */
export async function getListadoComercial({ page = 1, pageSize = 20, categoria } = {}) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (categoria) params.set("categoria", String(categoria));
  return pedir(`${BASE}/promociones/productos?${params}`);
}

/**
 * Las programaciones que ocupan el mes visible.
 *
 * Filtro de SOLAPAMIENTO como el de campañas: una que arranca en agosto y
 * termina en octubre ocupa septiembre y tiene que aparecer al mirar ese mes.
 */
export async function getProgramaciones({ desde, hasta } = {}) {
  const query = desde && hasta ? `?desde=${desde}&hasta=${hasta}` : "";
  return pedir(`${BASE}/promociones/programaciones${query}`);
}

/** Programa una promoción suelta, sin campaña. Nace habilitada. */
export async function programarPromocion(promocionId, { desde, hasta }) {
  return pedir(`${BASE}/promociones/${promocionId}/programaciones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ desde, hasta }),
  });
}

/** El OFF manual de una programación: deja de aplicarse sin perder el período. */
export async function cambiarEstadoProgramacion(programacionId, habilitada) {
  return pedir(`${BASE}/promociones/programaciones/${programacionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ habilitada }),
  });
}

/** Borra el período. **No borra la promoción**, que sigue existiendo. */
export async function eliminarProgramacion(programacionId) {
  return pedir(`${BASE}/promociones/programaciones/${programacionId}`, { method: "DELETE" });
}

/**
 * Dónde dos promociones se pisan el precio de un producto.
 *
 * Se calcula cada vez, no se guarda: un snapshot habría que invalidarlo ante
 * cualquier cambio de items, de programación o de estado de campaña.
 */
export async function getConflictos() {
  return pedir(`${BASE}/promociones/conflictos`);
}
