/**
 * Auth token storage + authenticated fetch wrapper for the admin panel.
 * Consumed by `products.js` (write routes) and `usuarios.js` (Task 10/12) to
 * attach the `Authorization` header without each call site re-implementing
 * 401 handling.
 */

const TOKEN_KEY = "admin_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Wrapper de fetch para requests autenticados del admin. Agrega el header
 * Authorization y, ante un 401 (token ausente/inválido/expirado en el
 * backend), limpia el token y redirige a login.
 */
export async function fetchAutenticado(url, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.assign("/catalogo/admin/login");
  }

  return res;
}
