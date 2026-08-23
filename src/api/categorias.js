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
import { fetchConTimeout } from "./http.js";
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
