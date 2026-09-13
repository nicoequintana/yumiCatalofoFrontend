import { fetchAutenticado } from "./authClient.js";
import { fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/**
 * Public, unauthenticated config for the WhatsApp contact button.
 * @returns {Promise<{numero: string, dentroDeHorario: boolean, textoHorario: string}>}
 */
export async function getWhatsappConfig() {
  const res = await fetchConTimeout(`${BASE}/config/whatsapp`);

  const texto = await res.text();
  const body = parsearCuerpo(texto);

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * `GET /config/contacto` — PÚBLICO, sin auth. Alimenta el pie del catálogo:
 * WhatsApp (con horario resuelto), mail, redes y dirección. `authOpcional` en
 * el backend decide `crudo` por el TOKEN, así que esta llamada sin
 * `Authorization` nunca lo trae — ver `getConfigContactoAdmin` para eso.
 *
 * @returns {Promise<{whatsapp: {numero: string|null, dentroDeHorario: boolean|null, textoHorario: string|null}, email: string|null, instagram: string|null, facebook: string|null, tiktok: string|null, direccion: string|null}>}
 */
export async function getConfigContacto() {
  const res = await fetchConTimeout(`${BASE}/config/contacto`);
  const body = parsearCuerpo(await res.text());

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * Mismo endpoint que `getConfigContacto`, pero AUTENTICADO: el token admin le
 * suma la clave `crudo` (los nueve campos SIN fallback a `.env`), que es lo
 * que edita el formulario de Configuración › Contacto — nunca el valor
 * resuelto que ve el catálogo público.
 */
export async function getConfigContactoAdmin() {
  const res = await fetchAutenticado(`${BASE}/config/contacto`);
  const body = parsearCuerpo(await res.text());

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * `PUT /config/contacto` — requiere sesión admin. `campos` es parcial a
 * propósito (mismo criterio que `updateAnuncio`): una clave ausente es "no la
 * toques", un string vacío es "bórralo". Devuelve la vista admin (con
 * `crudo`).
 */
export async function putConfigContacto(campos) {
  const res = await fetchAutenticado(`${BASE}/config/contacto`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(campos),
  });
  const body = parsearCuerpo(await res.text());

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * `GET /config/home` — PÚBLICO, sin auth (T5). Alimenta la sección "Producto
 * ícono" de la home pública (T14).
 *
 * **Degrada a `productoIcono: null`** cuando nadie eligió producto, el
 * producto elegido fue borrado, o dejó de estar publicado/con stock — igual
 * que `getConfigContacto` frente a `getConfigContactoAdmin`, este endpoint NO
 * tiene una vista admin separada (confirmado en T5: ni siquiera con token
 * admin destapa un producto oculto). `AdminProductos.jsx` usa esta misma
 * llamada para pintar la selección inicial y por eso puede no reflejar un
 * ícono elegido que hoy está oculto — ver la ficha de T7 para el detalle.
 *
 * @returns {Promise<{productoIcono: Object|null}>}
 */
export async function getConfiguracionHome() {
  const res = await fetchConTimeout(`${BASE}/config/home`);
  const body = parsearCuerpo(await res.text());

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}

/**
 * `PUT /config/home` — requiere sesión admin (T5). Singleton: elegir un
 * `productoIconoId` reemplaza al anterior automáticamente, no hace falta
 * "desmarcar" nada antes.
 *
 * A diferencia del `GET` público, esta respuesta NO degrada a `null` por
 * producto oculto/sin stock: trae el detalle recién guardado tal cual, así
 * que es la fuente correcta para reflejar en el panel el producto elegido
 * (`AdminProductos.jsx` la usa para actualizar el estado después de elegir).
 *
 * @param {number|null} productoIconoId
 * @returns {Promise<{productoIcono: Object|null}>}
 */
export async function actualizarConfiguracionHome(productoIconoId) {
  const res = await fetchAutenticado(`${BASE}/config/home`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productoIconoId }),
  });
  const body = parsearCuerpo(await res.text());

  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }

  return body;
}
