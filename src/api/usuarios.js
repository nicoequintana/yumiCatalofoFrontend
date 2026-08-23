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

/** @returns {Promise<Object>} the newly created user */
export async function createUsuario(email, password) {
  return pedir(`${BASE}/usuarios`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/** @returns {Promise<Object>} the updated user */
export async function updateUsuario(id, { email, password }) {
  return pedir(`${BASE}/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

/** @returns {Promise<{ok: true}>} */
export async function deleteUsuario(id) {
  return pedir(`${BASE}/usuarios/${id}`, { method: "DELETE" });
}
