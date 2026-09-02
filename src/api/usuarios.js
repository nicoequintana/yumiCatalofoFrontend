/**
 * REST client for the `/api/usuarios` backend (Express + JWT). Manages the
 * admin user list — all requests go through `fetchAutenticado` since these
 * routes require a valid token.
 */
import { fetchAutenticado } from "./authClient.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

async function pedir(url, options) {
  const res = await fetchAutenticado(url, options);

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/** @returns {Promise<Array>} all admin users */
export async function getUsuarios() {
  return pedir(`${BASE}/usuarios`);
}

/**
 * @param {string} email
 * @param {string} password
 * @param {{puedeEliminar?: boolean}} [opciones] permiso de acciones destructivas.
 *   El default del backend es `true` (igual que el de la columna), así que
 *   omitirlo crea un usuario con permiso: restringir es siempre explícito.
 * @returns {Promise<Object>} the newly created user
 */
export async function createUsuario(email, password, { puedeEliminar } = {}) {
  return pedir(`${BASE}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, ...(puedeEliminar === undefined ? {} : { puedeEliminar }) }),
  });
}

/**
 * `puedeEliminar` se manda SOLO si viene: en el backend, omitirlo significa "no
 * lo toques". Mandarlo siempre haría que editar un email le devolviera el
 * permiso a alguien de rebote.
 *
 * @returns {Promise<Object>} the updated user
 */
export async function updateUsuario(id, { email, password, puedeEliminar }) {
  return pedir(`${BASE}/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      ...(puedeEliminar === undefined ? {} : { puedeEliminar }),
    }),
  });
}

/** @returns {Promise<{ok: true}>} */
export async function deleteUsuario(id) {
  return pedir(`${BASE}/usuarios/${id}`, { method: "DELETE" });
}
