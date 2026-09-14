import { fetchConTimeout } from "./http.js";
import { parsearCuerpo } from "./parseo.js";
import { notificarCambioSesion } from "../utils/eventosSesion.js";

/**
 * Espera antes del único reintento de `VERIFICACION_NO_DISPONIBLE`. No es
 * backoff exponencial a propósito: hay un solo reintento, así que un segundo
 * valor no tendría dónde aplicarse.
 */
const ESPERA_REINTENTO_MS = 1500;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Una vuelta de fetch. Devuelve SIEMPRE `{ res, body }` —nunca lanza por el
 * status— porque quien decide (`resolver`) necesita el cuerpo para mirar el
 * `codigo`, y el cuerpo solo se puede leer una vez por respuesta.
 */
async function pedirUnaVez(url, options) {
  // `credentials: "include"` va DESPUÉS de `...options` para que ningún call
  // site pueda pisarlo: sin la cookie `sesion_cliente` toda ruta de
  // `/api/cuenta/*` responde 401, y el bug se vería como "se cayó la sesión".
  const res = await fetchConTimeout(url, { ...options, credentials: "include" });
  const texto = await res.text();
  return { res, body: parsearCuerpo(texto) };
}

/**
 * Arma el Error que ve el caller: el mensaje en español del backend, más
 * `.status`/`.codigo`/`.motivo` para que una pantalla pueda ramificar sin
 * parsear el mensaje (`err.motivo === "VENCIDO"`, `err.codigo === "SOLO_GMAIL"`).
 */
function armarError(body, res) {
  const err = new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  err.status = res.status;
  if (body?.codigo) err.codigo = body.codigo;
  if (body?.motivo) err.motivo = body.motivo;
  return err;
}

/**
 * Traduce una respuesta ya leída a "valor devuelto" o "excepción". Es una
 * función aparte —y no código inline en `pedirCliente`— para que el REINTENTO
 * pase por exactamente el mismo juicio que el primer intento: la sesión se
 * puede caer entre el 503 y el reintento (vencimiento, o un "cerrar sesión en
 * todos lados" desde otro dispositivo), y si esa segunda vuelta no mirara
 * `SESION_INVALIDA` este módulo dejaría de ser el ÚNICO lugar que redirige.
 */
function resolver({ res, body }) {
  if (res.status === 401 && body?.codigo === "SESION_INVALIDA") {
    // El cache del perfil quedó mintiendo: dice que hay sesión y no la hay.
    // Se avisa ANTES de navegar para que la pantalla de login no lea un
    // perfil fantasma al montar. Este módulo no importa `usePerfilCliente.js`
    // directamente —eso cerraba un ciclo con `api/cuenta.js`—, así que avisa
    // por `eventosSesion.js` y es `usePerfilCliente.js` quien se suscribe.
    notificarCambioSesion();
    const ruta = window.location.pathname + window.location.search;
    window.location.assign(`/cuenta/entrar?volverA=${encodeURIComponent(ruta)}`);
    // Se LANZA igual que en `authClient.js`: sin esto el caller sigue
    // ejecutando y muestra su propio error un instante antes de que la
    // navegación recargue la página.
    throw new Error("Tu sesión expiró. Iniciá sesión de nuevo.");
  }

  if (!res.ok) throw armarError(body, res);
  return body;
}

/**
 * Fetch autenticado por cookie para `/api/cuenta/*` (y `POST /api/ordenes` en
 * sesión). Nunca lee ni escribe un token: la sesión viaja en la cookie
 * httpOnly `sesion_cliente`, así que `credentials: "include"` es lo único que
 * hace falta para que el navegador la adjunte — no hay header que armar.
 *
 * Tres códigos de error tienen tratamiento especial (ver "Sesión del
 * cliente" de la spec):
 *
 * - `401 SESION_INVALIDA`: la sesión murió (vencida, revocada, cuenta no
 *   verificada). Se invalida el cache del perfil y se manda a
 *   `/cuenta/entrar?volverA=<ruta actual>`, igual que `authClient.js` hace
 *   con el admin. Un 401 CON otro código (o sin código) es un error normal
 *   del endpoint — "contraseña incorrecta" también es 401 — y no dispara
 *   nada de esto.
 * - `503 VERIFICACION_NO_DISPONIBLE`: falló la CONSULTA que verifica la
 *   sesión, no la sesión. Se reintenta UNA vez tras 1.5s; si vuelve a
 *   fallar, se lanza.
 * - `503 CAPACIDAD`: la cola de bcrypt está llena (load shedding). Nunca se
 *   reintenta acá — reintentar contra una cola saturada la satura más. Trae
 *   `Retry-After`, que este módulo NO lee: es un header no simple y el CORS
 *   del backend no lo expone, así que el navegador no lo deja ver.
 *
 * @param {string} url URL absoluta del endpoint.
 * @param {object} [options] opciones de fetch; `credentials` se ignora.
 * @returns {Promise<any>} el cuerpo parseado (`null` si vino vacío, p. ej. un 204).
 * @throws {Error} con `.status` cuando la respuesta LLEGÓ (un timeout de
 *   `fetchConTimeout` o una caída de red rechazan sin `.status`), y con
 *   `.codigo`/`.motivo` si además el backend los mandó.
 */
export async function pedirCliente(url, options = {}) {
  const primera = await pedirUnaVez(url, options);

  if (primera.res.status === 503 && primera.body?.codigo === "VERIFICACION_NO_DISPONIBLE") {
    await esperar(ESPERA_REINTENTO_MS);
    return resolver(await pedirUnaVez(url, options));
  }

  return resolver(primera);
}
