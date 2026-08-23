/**
 * Auth token storage + authenticated fetch wrapper for the admin panel.
 * Consumed by `products.js` (write routes) and `usuarios.js` (Task 10/12) to
 * attach the `Authorization` header without each call site re-implementing
 * 401 handling.
 */

import { TIMEOUT_REQUEST_MS, fetchConTimeout } from "./http.js";

const TOKEN_KEY = "admin_token";

// Las tres funciones toleran un localStorage bloqueado por política del
// navegador ("bloquear todas las cookies" en Chrome lanza SecurityError al
// ACCEDER al storage): getToken degrada a "sin sesión" y los setters son
// no-ops silenciosos. Sin esto, cualquier ruta admin reventaba en render
// (RequireAuth llama a getToken) y caía al error boundary, y el login
// reventaba en setToken.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Sin storage no hay sesión persistida: el login "funciona" hasta la
    // próxima recarga, que es lo mejor que se puede ofrecer sin storage.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Si no se pudo escribir nunca, tampoco hay nada que borrar.
  }
}

/**
 * Wrapper de fetch para requests autenticados del admin. Agrega el header
 * Authorization y, ante un 401 (token ausente/inválido/expirado en el
 * backend), limpia el token, redirige a login preservando la ruta actual en
 * `?volverA=` (para que el re-login vuelva a donde estaba el admin) y LANZA
 * para cortar la ejecución del caller — devolver el `res` hacía que el
 * caller parseara y lanzara su propio error, visible un instante antes de
 * que la página recargara.
 *
 * @param {string} url
 * @param {object} [options]
 * @param {number} [timeoutMs] margen mayor para subidas de archivos
 *   (`TIMEOUT_SUBIDA_MS`); ver `http.js`.
 */
export async function fetchAutenticado(url, options = {}, timeoutMs = TIMEOUT_REQUEST_MS) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetchConTimeout(url, { ...options, headers }, timeoutMs);

  if (res.status === 401) {
    clearToken();
    const destino = new URLSearchParams({
      volverA: window.location.pathname + window.location.search,
    });
    window.location.assign(`/catalogo/admin/login?${destino}`);
    throw new Error("Tu sesión expiró. Iniciá sesión de nuevo.");
  }

  return res;
}
