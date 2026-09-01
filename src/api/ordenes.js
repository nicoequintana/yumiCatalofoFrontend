/**
 * REST client for the `/api/ordenes` backend (Express + Prisma + SQL
 * Server). Guest checkout — PUBLIC, no auth/JWT (see
 * `backend/src/controllers/ordenes.controller.js`'s `crear()`). Mirrors
 * `categorias.js`'s plain `pedir()` helper, NOT `products.js`'s
 * `pedirAutenticado` (which attaches a JWT and redirects to admin login on
 * 401 — wrong for a public customer-facing flow).
 */

import { fetchAutenticado } from "./authClient.js";
import { fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Shared fetch helper. Parses the JSON body and throws a plain `Error` with
 * the backend's Spanish message on non-2xx responses.
 */
async function pedir(url, options) {
  const res = await fetchConTimeout(url, options);

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/** Igual que `pedir`, pero usa el wrapper autenticado (agrega el JWT y maneja 401). */
async function pedirAutenticado(url, options) {
  const res = await fetchAutenticado(url, options);
  const texto = await res.text();
  const body = parsearCuerpo(texto);
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

/**
 * Crea una orden de checkout de invitado.
 * @param {{dni: string, nombre: string, telefono: string, email?: string, notas?: string, items: Array<{productId: number, cantidad: number}>}} data
 * @returns {Promise<Object>} la orden creada, con `cliente` e `items` incluidos.
 */
export async function crearOrden(data) {
  return pedir(`${BASE}/ordenes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Listado paginado de órdenes para el panel admin. Requiere sesión.
 * @param {{estado?: string, desde?: string, hasta?: string, dni?: string, nombre?: string, page?: number, pageSize?: number}} filtros
 * @returns {Promise<{data: Array, page: number, pageSize: number, total: number}>}
 */
export async function getOrdenes(filtros = {}) {
  const { estado, desde, hasta, dni, nombre, page, pageSize } = filtros;
  const params = new URLSearchParams();

  if (estado !== undefined && estado !== null && estado !== "") params.set("estado", estado);
  if (desde !== undefined && desde !== null && desde !== "") params.set("desde", desde);
  if (hasta !== undefined && hasta !== null && hasta !== "") params.set("hasta", hasta);
  if (dni !== undefined && dni !== null && dni !== "") params.set("dni", dni);
  if (nombre !== undefined && nombre !== null && nombre !== "") params.set("nombre", nombre);
  if (page !== undefined && page !== null && page !== "") params.set("page", page);
  if (pageSize !== undefined && pageSize !== null && pageSize !== "") params.set("pageSize", pageSize);

  const query = params.toString();
  return pedirAutenticado(`${BASE}/ordenes${query ? `?${query}` : ""}`);
}

/**
 * Grilla de productos solicitados: agrupa por producto todo lo que los
 * clientes vienen pidiendo, a través de todas las órdenes menos las
 * canceladas. Requiere sesión.
 *
 * @returns {Promise<{data: Array<{productId: number|null, sku: string|null, nombre: string, unidades: number, ordenes: number, facturacion: string}>, historico: {ordenesAnalizadas: number, tope: number, recortado: boolean}}>}
 */
export async function getProductosSolicitados() {
  return pedirAutenticado(`${BASE}/ordenes/productos-solicitados`);
}

/**
 * Descarga esa misma grilla como `.xlsx` y dispara el "guardar como" del
 * browser.
 *
 * El archivo se pide con el header de auth, así que no sirve un `<a href>`
 * directo: hay que traerlo como blob y crear un object URL temporal. Mismo
 * patrón que `descargarPlantilla` en `importProductos.js`.
 */
export async function descargarProductosSolicitados() {
  const res = await fetchAutenticado(`${BASE}/ordenes/productos-solicitados/export`);

  if (!res.ok) {
    throw new Error("No se pudo descargar el Excel de productos solicitados.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "productos-solicitados.xlsx";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

/**
 * Detalle completo de una orden (cliente + items), para el panel admin.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function getOrdenById(id) {
  return pedirAutenticado(`${BASE}/ordenes/${id}`);
}

/**
 * Cambia el estado de una orden. Sin restricciones de transición — cualquier
 * estado válido puede pasar a cualquier otro (ver
 * `backend/src/controllers/ordenes.controller.js`'s `actualizarEstado`).
 *
 * `notificarCliente` decide si además se le manda un mail al comprador
 * avisándole del cambio. El default es `false`: notificar es una decisión
 * explícita que el admin toma en el diálogo, nunca un efecto colateral de
 * guardar. Cuando es `true`, la respuesta trae `notificacion`
 * (`{intentada, enviada, error?}`) — el estado se guarda igual aunque el
 * correo falle.
 *
 * @param {number|string} id
 * @param {string} estado uno de: PENDIENTE, EN_PREPARACION, ENTREGADA, CANCELADA
 * @param {boolean} [notificarCliente=false]
 * @returns {Promise<Object>} la orden actualizada
 */
export async function actualizarEstadoOrden(id, estado, notificarCliente = false) {
  return pedirAutenticado(`${BASE}/ordenes/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado, notificarCliente }),
  });
}
