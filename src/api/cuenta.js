/**
 * Un cliente por endpoint de `/api/cuenta/*` (Partes 1-3). Estas funciones son
 * DELIBERADAMENTE finas: arman la URL, pasan el cuerpo y devuelven lo que
 * devolvió `pedirCliente`.
 *
 * Lo que NO hacen, y por qué:
 *
 * - **No manejan errores.** `clienteAuth.js` es el ÚNICO lugar que redirige por
 *   `SESION_INVALIDA` (401), el único que reintenta `VERIFICACION_NO_DISPONIBLE`
 *   (503) y el que decide no reintentar `CAPACIDAD` (503). Un `try/catch` acá
 *   duplicaría esa decisión y rompería la regla de "un solo lugar que redirige".
 *   El error sube con `.status` y, si el backend los mandó, `.codigo`/`.motivo`,
 *   que es sobre lo que ramifica cada pantalla (`err.motivo === "VENCIDO"`).
 * - **No reenvuelven la respuesta.** `pedirCliente` ya devuelve el cuerpo
 *   PARSEADO (`null` si vino vacío, como el 204 de `/salir`). Envolverlo haría
 *   que las pantallas leyeran un objeto que el backend nunca mandó.
 * - **No agregan `credentials`.** `pedirCliente` lo fuerza después del spread de
 *   las opciones: no se puede pisar desde acá, y no hace falta.
 */

import { pedirCliente } from "./clienteAuth.js";

// La URL la arma ESTE módulo porque `pedirCliente` exige una URL absoluta.
// Mismo patrón que el resto de `src/api/` y que `hooks/usePerfilCliente.js`.
const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api/cuenta`;

function post(ruta, body) {
  return pedirCliente(`${BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function put(ruta, body) {
  return pedirCliente(`${BASE}${ruta}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Alta de cuenta. Responde SIEMPRE 200 con `{mensaje}`, exista o no el email:
 * el backend no delata si la dirección ya estaba registrada (enumeración).
 * `apodo` es OPCIONAL y es el único que lo es: sin él el alta viaja igual que
 * antes de que el campo existiera, porque `JSON.stringify` descarta las claves
 * `undefined`.
 *
 * @param {{email: string, password: string, nombre: string, telefono: string, dni: string, apodo?: string}} datos
 * @returns {Promise<{mensaje: string}>}
 * @throws {Error} con `.status` (p. ej. 400 de validación, 503 `CAPACIDAD`).
 */
export function registrarCuenta({ email, password, nombre, telefono, dni, apodo }) {
  return post("/registro", { email, password, nombre, telefono, dni, apodo });
}

/**
 * Confirma la cuenta con el token del mail de verificación.
 * @param {string} token
 * @returns {Promise<{mensaje: string}>}
 * @throws {Error} 400 con `.motivo` `"INVALIDO"` | `"USADO"` | `"VENCIDO"`.
 */
export function verificarCuenta(token) {
  return post("/verificar", { token });
}

/**
 * Pide otro mail de verificación.
 * @param {string} email
 * @returns {Promise<{mensaje: string}>}
 * @throws {Error} con `.status`.
 */
export function reenviarVerificacion(email) {
  return post("/reenviar-verificacion", { email });
}

/**
 * Login local. Dos respuestas 200 DISTINTAS: `{ok:true}` (sesión abierta, la
 * cookie ya viaja) o `{requiereCodigo:true}` (navegador desconocido: hay que
 * pedir el código). La pantalla ramifica sobre esas dos claves.
 * @param {{email: string, password: string}} datos
 * @returns {Promise<{ok?: true, requiereCodigo?: true}>}
 * @throws {Error} 401 con el mensaje del backend (credenciales inválidas).
 */
export function loginCuenta({ email, password }) {
  return post("/login", { email, password });
}

/**
 * Segundo paso del login: el código de 6 dígitos del mail.
 * @param {{email: string, codigo: string}} datos
 * @returns {Promise<{ok: true}>}
 * @throws {Error} 401 con el mensaje del backend (código inválido o vencido).
 */
export function loginCodigo({ email, codigo }) {
  return post("/login/codigo", { email, codigo });
}

/**
 * Reenvía el código de login.
 * @param {string} email
 * @returns {Promise<{mensaje: string}>}
 * @throws {Error} con `.status`.
 */
export function reenviarCodigo(email) {
  return post("/login/codigo/reenviar", { email });
}

/**
 * Login con Google: el `credential` es el ID token que entrega GIS.
 * `completar` viene en `true` cuando a la cuenta le falta nombre, teléfono o
 * DNI — lo decide el BACKEND, el frontend no lo recalcula.
 * @param {string} credential
 * @returns {Promise<{ok: true, completar: boolean}>}
 * @throws {Error} 403 `.codigo === "SOLO_GMAIL"`, 409, o 503
 *   `.codigo === "GOOGLE_NO_CONFIGURADO"`.
 */
export function loginGoogle(credential) {
  return post("/google", { credential });
}

/**
 * Cierra la sesión. Sin cuerpo: el backend identifica la sesión por la cookie.
 * Responde 204, así que `pedirCliente` devuelve `null` — no hay objeto que leer.
 * @returns {Promise<null>}
 * @throws {Error} con `.status`.
 */
export function salirCuenta() {
  return pedirCliente(`${BASE}/salir`, { method: "POST" });
}

/**
 * El perfil de la sesión.
 * @returns {Promise<{id: number, email: string, origenRegistro: string, nombre: string|null, telefono: string|null, dni: string|null, tieneGoogle: boolean, tienePassword: boolean}>}
 * @throws {Error} 401 `SESION_INVALIDA` (lo maneja `clienteAuth.js`, no el
 *   caller) o 503 `VERIFICACION_NO_DISPONIBLE`.
 */
export function getPerfil() {
  return pedirCliente(BASE, { method: "GET" });
}

/**
 * Actualiza el perfil. Todos los campos son OPCIONALES y el backend solo toca
 * los que vienen (`req.body?.nombre !== undefined`).
 *
 * `JSON.stringify` descarta las claves `undefined`, así que pasar
 * `{nombre: "A", telefono: undefined}` manda únicamente `nombre` y deja el
 * teléfono como estaba.
 *
 * Mandar `""` es otra cosa —"vacialo"— y el backend lo trata DISTINTO según el
 * campo: para `nombre`, `telefono` y `dni` es un 400, porque son obligatorios;
 * para `apodo` es la forma de BORRARLO, y responde 200 con `apodo: null`. Es la
 * única asimetría de esta función y es deliberada: un dato opcional que no se
 * puede sacar es una trampa para quien se arrepiente de haberlo puesto.
 *
 * @param {{nombre?: string, telefono?: string, dni?: string, apodo?: string}} datos
 * @returns {Promise<object>} el perfil ya actualizado, con la misma forma que `getPerfil`.
 * @throws {Error} 400 de validación con el mensaje del backend.
 */
export function actualizarPerfil({ nombre, telefono, dni, apodo }) {
  return put("", { nombre, telefono, dni, apodo });
}

/**
 * Arranca la recuperación de contraseña. Responde 200 exista o no el email
 * (enumeración), así que un 200 NO prueba que la cuenta existe.
 * @param {string} email
 * @returns {Promise<{mensaje: string}>}
 * @throws {Error} con `.status`.
 */
export function olvidePassword(email) {
  return post("/olvide", { email });
}

/**
 * Fija la contraseña nueva con el token del mail.
 *
 * ⚠️ Responde `{ok: true}`, NO `{mensaje}` como dice la tabla del plan
 * (verificado en `backend/src/controllers/cuentaRecuperacion.controller.js`):
 * la pantalla tiene que leer `ok` y poner su propio texto de éxito.
 *
 * @param {{token: string, password: string}} datos
 * @returns {Promise<{ok: true}>}
 * @throws {Error} 400 con `.motivo` (token inválido, usado o vencido).
 */
export function restablecerPassword({ token, password }) {
  return post("/restablecer", { token, password });
}

/**
 * Pide el cambio de email: manda un mail de confirmación a la dirección NUEVA.
 * El email todavía no cambió cuando esto resuelve.
 * @param {{emailNuevo: string, password: string}} datos
 * @returns {Promise<{mensaje: string}>} el mensaje avisa si además se va a
 *   desvincular Google — lo redacta el backend, no se arma acá.
 * @throws {Error} con `.status`.
 */
export function cambiarEmail({ emailNuevo, password }) {
  return put("/email", { emailNuevo, password });
}

/**
 * Confirma el cambio de email con el token del mail. No exige sesión: es un
 * link que se abre desde el correo.
 * @param {string} token
 * @returns {Promise<{mensaje: string}>}
 * @throws {Error} 400 con `.motivo`, o 409 si el email ya lo tomó otra cuenta
 *   entre el pedido y la confirmación.
 */
export function confirmarEmail(token) {
  return post("/email/confirmar", { token });
}

/**
 * Cambia la contraseña estando en sesión.
 * @param {{actual: string, nueva: string}} datos
 * @returns {Promise<{ok: true}>}
 * @throws {Error} 401 con el mensaje del backend (la actual no coincide) o 409
 *   si la contraseña cambió por otro lado mientras tanto.
 */
export function cambiarPassword({ actual, nueva }) {
  return put("/password", { actual, nueva });
}

/**
 * "Mis pedidos": listado paginado de la cuenta en sesión.
 *
 * Se saltean los filtros ausentes para no mandar `?page=undefined`. Mismo
 * criterio que `agregarFiltros` en `api/ordenes.js`.
 *
 * @param {{page?: number|string, pageSize?: number|string}} [filtros]
 * @returns {Promise<{data: Array<{id: number, estado: string, estadoEtiqueta: string, createdAt: string, total: string, cantidadItems: number, resumen: string}>, page: number, pageSize: number, total: number}>}
 *   `estadoEtiqueta` y `resumen` los arma el backend: no se derivan acá.
 * @throws {Error} con `.status`.
 */
export function getPedidos({ page, pageSize } = {}) {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries({ page, pageSize })) {
    if (valor === undefined || valor === null || valor === "") continue;
    params.set(clave, valor);
  }
  const query = params.toString();
  return pedirCliente(`${BASE}/ordenes${query ? `?${query}` : ""}`);
}

/**
 * Detalle de un pedido propio. Una orden ajena responde 404, nunca 403: el
 * backend no confirma que exista.
 * @param {number|string} id
 * @returns {Promise<{id: number, estado: string, estadoEtiqueta: string, notas: string|null, createdAt: string, updatedAt: string, items: Array<{nombreProducto: string, cantidad: number, precioUnitario: string, fotoPortada: string|null}>, total: string}>}
 * @throws {Error} 404 si no es una orden de esta cuenta.
 */
export function getPedidoPorId(id) {
  return pedirCliente(`${BASE}/ordenes/${id}`);
}
