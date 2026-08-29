/**
 * REST client for the `/api/categorias` backend (Express + Prisma +
 * SQL Server). Categories are managed in the admin panel and used to
 * organize products.
 *
 * Split de auth deliberado, espejo del backend (`categorias.routes.js`):
 * `getCategorias` (GET) es PÚBLICO y va con `fetch` plano — alimenta los
 * filtros de `/coleccion`, que se navega sin login; mandarlo por
 * `fetchAutenticado` haría que un 401 redirija a un visitante anónimo al
 * login del admin. Las tres funciones de escritura solo las usa
 * `AdminCategorias.jsx` y van por `fetchAutenticado` (adjunta el JWT y maneja
 * el 401 limpiando el token).
 */

import { fetchAutenticado } from "./authClient.js";
import { TIMEOUT_SUBIDA_MS, fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Shared fetch helper. Parses the JSON body and throws a plain `Error` with
 * the backend's Spanish message on non-2xx responses.
 */
async function pedir(url, options) {
  const res = await fetchConTimeout(url, options);

  // 204/empty-body responses (none currently exist, but keep this safe).
  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * Igual que `pedir`, pero usa el wrapper autenticado (agrega el JWT y maneja
 * 401). El `timeoutMs` es el tercer argumento posicional de
 * `fetchAutenticado`, no una clave de `options` — se expone acá para que la
 * subida de imagen pueda pedir el timeout largo.
 */
async function pedirAutenticado(url, options, timeoutMs) {
  // El tercer argumento se OMITE cuando no se pide un timeout propio, en lugar
  // de mandarse como `undefined`: `fetchAutenticado` ya tiene su default, y un
  // `undefined` explícito cambia la forma de la llamada para todos los
  // consumidores que no lo necesitan.
  const args = timeoutMs === undefined ? [url, options] : [url, options, timeoutMs];
  const res = await fetchAutenticado(...args);

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * PÚBLICO — sin auth. No cambiar a `pedirAutenticado`: lo consume
 * `Coleccion.jsx` (página pública, sin sesión).
 * @returns {Promise<Array>} all categories, each with `cantidadProductos`
 */
export async function getCategorias() {
  return pedir(`${BASE}/categorias`);
}

/** Requiere sesión admin. @returns {Promise<Object>} the newly created category */
export async function createCategoria(nombre) {
  return pedirAutenticado(`${BASE}/categorias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

/** Requiere sesión admin. @returns {Promise<Object>} the updated category */
export async function updateCategoria(id, nombre) {
  return pedirAutenticado(`${BASE}/categorias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

/** Requiere sesión admin. @returns {Promise<{ok: true}>} */
export async function deleteCategoria(id) {
  return pedirAutenticado(`${BASE}/categorias/${id}`, { method: "DELETE" });
}

/**
 * Marca o desmarca una categoría para la sección "Explorá por categoría" de la
 * home. Requiere sesión admin.
 *
 * El backend topea en 3 y responde 400 al intentar una cuarta — el mensaje de
 * ese error es el que se le muestra al admin, no uno inventado acá.
 *
 * @returns {Promise<Object>} la categoría actualizada
 */
export async function destacarCategoriaEnHome(id, destacadaEnHome) {
  return pedirAutenticado(`${BASE}/categorias/${id}/home`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destacadaEnHome }),
  });
}

/**
 * Sube (o reemplaza) la foto de una categoría. Requiere sesión admin.
 *
 * Va como `FormData` y SIN `Content-Type` a mano: el navegador tiene que
 * poner el suyo con el `boundary` del multipart. Fijarlo acá rompe el parseo
 * del lado de multer.
 *
 * @returns {Promise<Object>} la categoría actualizada, con `imagenUrl`
 */
export async function subirImagenCategoria(id, archivo) {
  const cuerpo = new FormData();
  cuerpo.append("imagen", archivo);

  // `TIMEOUT_SUBIDA_MS`, igual que la media de producto: una foto pesada por
  // una conexión lenta supera de sobra los 15 s por defecto.
  return pedirAutenticado(
    `${BASE}/categorias/${id}/imagen`,
    { method: "PUT", body: cuerpo },
    TIMEOUT_SUBIDA_MS,
  );
}

/** Quita la foto de una categoría y borra el archivo remoto. Requiere sesión admin. */
export async function quitarImagenCategoria(id) {
  return pedirAutenticado(`${BASE}/categorias/${id}/imagen`, { method: "DELETE" });
}
