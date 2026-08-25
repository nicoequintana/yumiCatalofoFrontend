/**
 * Cliente REST de `/api/anuncios` — los mensajes de la cinta del catálogo
 * público (`BarraAnuncios`), administrados desde Configuración › Anuncios.
 *
 * Split de auth deliberado, espejo del backend (`anuncios.routes.js`):
 * `getAnuncios` es PÚBLICO y va con `fetch` plano — lo consume la cinta, que se
 * muestra a visitantes sin sesión; mandarlo por `fetchAutenticado` haría que un
 * 401 mande al login del admin a alguien que solo entró a ver el catálogo. Las
 * cuatro funciones de escritura y `getAnunciosAdmin` van por `fetchAutenticado`.
 *
 * Mismo criterio que `api/categorias.js`, que resuelve exactamente este reparto.
 */

import { fetchAutenticado } from "./authClient.js";
import { fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

async function pedir(url, options) {
  const res = await fetchConTimeout(url, options);
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

async function pedirAutenticado(url, options) {
  const res = await fetchAutenticado(url, options);
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

/**
 * PÚBLICO — sin auth. Devuelve solo los anuncios activos, ya ordenados.
 * No cambiar a `pedirAutenticado`: lo consume `BarraAnuncios`, que vive en el
 * catálogo público.
 */
export async function getAnuncios() {
  return pedir(`${BASE}/anuncios`);
}

/**
 * Requiere sesión admin. Mismo endpoint que `getAnuncios`, pero con el JWT
 * adjunto el backend incluye también los desactivados — quién los ve lo decide
 * el token, no el `?admin=1`, que viaja solo como señal de intención para que la
 * respuesta del panel no comparta URL con la pública (y ningún caché por URL le
 * sirva a un visitante una respuesta armada para un admin).
 */
export async function getAnunciosAdmin() {
  return pedirAutenticado(`${BASE}/anuncios?admin=1`);
}

export async function createAnuncio(texto) {
  return pedirAutenticado(`${BASE}/anuncios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto }),
  });
}

/**
 * `campos` es parcial a propósito: `{activo}` suelto para el interruptor de la
 * fila, `{texto}` suelto al editar. El backend trata una clave ausente como "no
 * la toques", nunca como `false`.
 */
export async function updateAnuncio(id, campos) {
  return pedirAutenticado(`${BASE}/anuncios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campos),
  });
}

export async function deleteAnuncio(id) {
  return pedirAutenticado(`${BASE}/anuncios/${id}`, { method: "DELETE" });
}

/** Reescribe la secuencia completa: la posición en el array define el orden. */
export async function reordenarAnuncios(ids) {
  return pedirAutenticado(`${BASE}/anuncios/orden`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}
