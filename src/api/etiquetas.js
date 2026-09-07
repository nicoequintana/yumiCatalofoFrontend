/**
 * Cliente REST de `/api/etiquetas` — las etiquetas comerciales de los
 * productos, administradas desde Configuración › Etiquetas.
 *
 * Cada función va autenticada, sin el split público/privado de
 * `api/anuncios.js`: el
 * catálogo público nunca pide esta lista, porque el color de cada chip viaja ya
 * resuelto dentro del producto (`products.mapper.js`).
 */

import { fetchAutenticado } from "./authClient.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

async function pedirAutenticado(url, options) {
  const res = await fetchAutenticado(url, options);
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

/** Todas las etiquetas creadas, con su color resuelto y su conteo de productos. */
export async function getEtiquetasAdmin() {
  return pedirAutenticado(`${BASE}/etiquetas`);
}

/**
 * Los 20 colores de la paleta. **La fuente es el backend: acá no hay copia**,
 * mismo criterio que `getEstadosOrden`. Es lo que mantiene la paleta en una
 * sola casa.
 */
export async function getOpcionesColor() {
  return pedirAutenticado(`${BASE}/etiquetas/opciones`);
}

export async function createEtiqueta(nombre, color) {
  return pedirAutenticado(`${BASE}/etiquetas`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, color: color ?? null }),
  });
}

/**
 * `campos` es parcial: `{nombre}` al renombrar, `{color}` al pintar. Una clave
 * ausente el backend la trata como "no la toques"; `color: null` explícito
 * devuelve la etiqueta a su color por defecto.
 */
export async function updateEtiqueta(id, campos) {
  return pedirAutenticado(`${BASE}/etiquetas/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campos),
  });
}

export async function deleteEtiqueta(id) {
  return pedirAutenticado(`${BASE}/etiquetas/${id}`, { method: "DELETE" });
}
