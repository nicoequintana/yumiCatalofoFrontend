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
 * Agrega a `params` los filtros presentes, salteando los ausentes o vacíos.
 *
 * Vive acá y no repetido en cada función porque el listado y el resumen tienen
 * que mandar EXACTAMENTE los mismos filtros: si divergen, el conteo de un chip
 * cuenta sobre un universo distinto del que muestra la tabla de abajo.
 */
function agregarFiltros(params, filtros) {
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor === undefined || valor === null || valor === "") continue;
    params.set(clave, valor);
  }
}

/**
 * Listado paginado de órdenes para el panel admin. Requiere sesión.
 *
 * `dias` es el preset del filtro de período de la grilla (Hoy / 7 / 30). Las
 * fechas explícitas le ganan del lado del backend, así que mandar los tres a
 * la vez no es ambiguo — pero la pantalla igual borra `dias` al tipear una
 * fecha, para que el chip activo no contradiga a los inputs.
 *
 * @param {{estado?: string, desde?: string, hasta?: string, dias?: number|string, dni?: string, nombre?: string, page?: number, pageSize?: number}} filtros
 * @returns {Promise<{data: Array, page: number, pageSize: number, total: number, periodo?: {desde: string, hasta: string, recortado: boolean}}>}
 *   `periodo` viaja SOLO cuando se mandó alguno de `desde`/`hasta`/`dias`.
 */
export async function getOrdenes(filtros = {}) {
  const { estado, desde, hasta, dias, dni, nombre, page, pageSize } = filtros;
  const params = new URLSearchParams();

  agregarFiltros(params, { estado, desde, hasta, dias, dni, nombre, page, pageSize });

  const query = params.toString();
  return pedirAutenticado(`${BASE}/ordenes${query ? `?${query}` : ""}`);
}

/**
 * Cuántas órdenes hay en cada estado: `{PENDIENTE, EN_PREPARACION, ENTREGADA,
 * CANCELADA}`. Alimenta los conteos de los chips de estado de la grilla.
 *
 * ⚠️ **No se llama `getResumenOrdenes` aunque la ruta sea `/ordenes/resumen`.**
 * En esta pantalla "resumen" ya significa otras dos cosas —el panel de
 * productos de una orden y el campo `orden.resumen` que lo alimenta—, así que
 * un tercer sentido para "los conteos por estado" se lee mal en cada call
 * site. La ruta HTTP se queda como está: la nombra el backend.
 *
 * **Ésta es la ÚNICA casa de la regla "los mismos filtros que el listado MENOS
 * `estado`"**: se descarta acá, por destructuring, aunque venga en el objeto.
 * Con el estado adentro, cada chip contaría solo su propio estado y "Todos" no
 * tendría de dónde salir. Recibe el objeto de filtros completo a propósito,
 * así ningún llamador tiene que acordarse de desarmarlo — y por eso un
 * `estado: undefined` en el call site no es defensa, es ruido.
 *
 * @param {{estado?: string, desde?: string, hasta?: string, dias?: number|string, dni?: string, nombre?: string}} filtros
 * @returns {Promise<Record<string, number>>}
 */
export async function getConteoOrdenesPorEstado(filtros = {}) {
  const { desde, hasta, dias, dni, nombre } = filtros;
  const params = new URLSearchParams();

  agregarFiltros(params, { desde, hasta, dias, dni, nombre });

  const query = params.toString();
  return pedirAutenticado(`${BASE}/ordenes/resumen${query ? `?${query}` : ""}`);
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

/**
 * Cache de módulo para la lista de estados: es una constante del deploy (no
 * sale de la base), así que se pide UNA vez por sesión y las demás pantallas la
 * reusan. Mismo criterio de "vive a nivel de módulo" que los hooks de
 * carrito/favoritos.
 */
let estadosCacheados = null;

/**
 * Los cuatro estados de orden con su etiqueta legible y si son terminales, en
 * orden de flujo: `[{valor, etiqueta, terminal}]`.
 *
 * Es LA fuente de las opciones de los selects de estado del panel — el
 * diccionario dejó de vivir en el frontend.
 */
export async function getEstadosOrden() {
  if (estadosCacheados) return estadosCacheados;
  const body = await pedirAutenticado(`${BASE}/ordenes/estados`);
  estadosCacheados = body?.estados ?? [];
  return estadosCacheados;
}

/** Solo para tests: olvida el cache entre casos. */
export function _limpiarCacheEstados() {
  estadosCacheados = null;
}
