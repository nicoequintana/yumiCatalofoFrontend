import { fetchAutenticado } from "./authClient.js";
import { parsearCuerpo } from "./parseo.js";
import { TIMEOUT_SUBIDA_MS, fetchConTimeout } from "./http.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Combos. Lo público (`GET /combos`, `/combos/:idSlug`, `/combos/opciones`) va
 * con `fetch` plano, sin JWT; lo del panel (`/combos/admin/...` y
 * `PUT /campanias/:id/combos`) con `fetchAutenticado`. Mismo patrón que
 * `promociones.js`. Los números llegan resueltos del backend: acá no se calcula nada.
 */
async function cuerpoOError(res) {
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

async function pedir(url, opciones, timeoutMs) {
  return cuerpoOError(await fetchAutenticado(url, opciones, timeoutMs));
}

/** `GET /combos`, o `GET /combos?ids=1,2` (incluye los no vigentes con `vigente: false`). */
export async function getCombos({ ids } = {}) {
  const query = Array.isArray(ids) && ids.length > 0 ? `?ids=${encodeURIComponent(ids.join(","))}` : "";
  return cuerpoOError(await fetchConTimeout(`${BASE}/combos${query}`));
}

/** `GET /combos/:idSlug` — `null` si no existe o no está vigente (404), como `getProductById`. */
export async function getCombo(idSlug) {
  const res = await fetchConTimeout(`${BASE}/combos/${idSlug}`);
  if (res.status === 404) return null;
  return cuerpoOError(res);
}

/** `GET /combos/opciones` — límites del formulario, sin copia manual en el frontend. */
export async function getOpcionesCombo() {
  return cuerpoOError(await fetchConTimeout(`${BASE}/combos/opciones`));
}

export async function getAdminCombos() {
  return pedir(`${BASE}/combos/admin/combos`);
}

export async function getAdminCombo(id) {
  return pedir(`${BASE}/combos/admin/combos/${id}`);
}

export async function crearCombo(datos) {
  return pedir(`${BASE}/combos/admin/combos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

export async function actualizarCombo(id, datos) {
  return pedir(`${BASE}/combos/admin/combos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

export async function eliminarCombo(id) {
  return pedir(`${BASE}/combos/admin/combos/${id}`, { method: "DELETE" });
}

/** `PUT /combos/admin/combos/:id/hero` — multipart, con el timeout largo de subidas. */
export async function guardarHeroCombo(id, archivo) {
  const cuerpo = new FormData();
  cuerpo.append("hero", archivo);
  return pedir(`${BASE}/combos/admin/combos/${id}/hero`, { method: "PUT", body: cuerpo }, TIMEOUT_SUBIDA_MS);
}

export async function quitarHeroCombo(id) {
  return pedir(`${BASE}/combos/admin/combos/${id}/hero`, { method: "DELETE" });
}

/**
 * `POST /combos/admin/combos/cotizar` — la vista previa mientras se edita.
 * Suma `limitante` ({productId, nombre} | null, "Lo limita X" §8.3.3) y
 * `items` ([{productId, descuento}], la pill de promo vigente por fila
 * §8.3.2): ninguna de las dos se calcula acá, viajan resueltas.
 */
export async function cotizarCombo({ items, porcentaje }) {
  return pedir(`${BASE}/combos/admin/combos/cotizar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, porcentaje }),
  });
}

/** `PUT /campanias/:id/combos` — mismo contrato que `guardarPromocionesDeCampania`. */
export async function guardarCombosDeCampania(campaniaId, comboIds) {
  return pedir(`${BASE}/campanias/${campaniaId}/combos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comboIds }),
  });
}
