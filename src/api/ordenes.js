/**
 * REST client for the `/api/ordenes` backend (Express + Prisma + SQL
 * Server). Guest checkout — PUBLIC, no auth/JWT (see
 * `backend/src/controllers/ordenes.controller.js`'s `crear()`). Mirrors
 * `categorias.js`'s plain `pedir()` helper, NOT `products.js`'s
 * `pedirAutenticado` (which attaches a JWT and redirects to admin login on
 * 401 — wrong for a public customer-facing flow).
 */

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Shared fetch helper. Parses the JSON body and throws a plain `Error` with
 * the backend's Spanish message on non-2xx responses.
 */
async function pedir(url, options) {
  const res = await fetch(url, options);

  const texto = await res.text();
  const body = texto ? JSON.parse(texto) : null;

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
