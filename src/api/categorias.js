/**
 * REST client for the `/api/categorias` backend (Express + Prisma +
 * SQL Server). Categories are managed in the admin panel and used to
 * organize products.
 */

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Shared fetch helper. Parses the JSON body and throws a plain `Error` with
 * the backend's Spanish message on non-2xx responses.
 */
async function pedir(url, options) {
  const res = await fetch(url, options);

  // 204/empty-body responses (none currently exist, but keep this safe).
  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/** @returns {Promise<Array>} all categories, each with `cantidadProductos` */
export async function getCategorias() {
  return pedir(`${BASE}/categorias`);
}

/** @returns {Promise<Object>} the newly created category */
export async function createCategoria(nombre) {
  return pedir(`${BASE}/categorias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

/** @returns {Promise<Object>} the updated category */
export async function updateCategoria(id, nombre) {
  return pedir(`${BASE}/categorias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

/** @returns {Promise<{ok: true}>} */
export async function deleteCategoria(id) {
  return pedir(`${BASE}/categorias/${id}`, { method: "DELETE" });
}
