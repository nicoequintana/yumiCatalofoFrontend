/**
 * REST client for the `/api/auth` backend (Express + JWT). Handles admin
 * login only — the resulting token is persisted by `authClient.js`, not
 * here, keeping this file a thin, side-effect-free fetch wrapper.
 */

import { fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/** @returns {Promise<{token: string}>} */
export async function login(email, password) {
  const res = await fetchConTimeout(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}
