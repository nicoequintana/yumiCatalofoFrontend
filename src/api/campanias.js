import { fetchConTimeout, TIMEOUT_SUBIDA_MS } from "./http.js";
import { fetchAutenticado, getToken } from "./authClient.js";
import { parsearCuerpo } from "./parseo.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api`;

/** Fetch público (sin token) con el parseo compartido de respuestas. */
async function pedir(url, opciones, timeout) {
  const res = await fetchConTimeout(url, opciones, timeout);
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

/** Fetch del panel. Ante 401 limpia el token y redirige al login. */
async function pedirAutenticado(url, opciones, timeout) {
  const res = await fetchAutenticado(url, opciones, timeout);
  const body = parsearCuerpo(await res.text());
  if (!res.ok) {
    throw new Error(body?.error ?? "Ocurrió un error al comunicarse con el servidor.");
  }
  return body;
}

/**
 * `GET /api/campanias/activas` — el contexto comercial vigente.
 *
 * Devuelve `{ claveDia, doodle }`, con `doodle: null` cuando no hay campaña
 * activa que lo aporte, que es el caso normal.
 *
 * La ruta lleva `authOpcional`: si hay sesión de admin se manda el token y la
 * respuesta suma `doodleAdmin`, el Doodle que la campaña eligió mostrar puertas
 * adentro. **No se usa `fetchAutenticado` a propósito**: ese helper limpia el
 * token y redirige al login ante un 401, y esto es una decoración — un token
 * vencido tiene que degradar a la vista anónima, nunca patear a alguien fuera
 * de la pantalla en la que estaba.
 *
 * NO lo consumas directo desde un componente: usá `hooks/useContextoComercial`,
 * que deduplica el pedido entre el navbar, el panel y lo que venga después.
 */
export async function getContextoComercial() {
  const token = getToken();
  return pedir(
    `${BASE}/campanias/activas`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
}

/**
 * `GET /api/campanias` — el listado del panel.
 *
 * `desde`/`hasta` acotan al mes que el calendario muestra, en formato
 * `AAAA-MM-DD`. El filtro es de SOLAPAMIENTO: una campaña que arranca en agosto
 * y termina en octubre aparece al mirar septiembre, porque ocupa ese mes.
 */
export async function getCampanias({ desde, hasta } = {}) {
  const query = desde && hasta ? `?desde=${desde}&hasta=${hasta}` : "";
  return pedirAutenticado(`${BASE}/campanias${query}`);
}

export async function getCampania(id) {
  return pedirAutenticado(`${BASE}/campanias/${id}`);
}

/**
 * `GET /api/campanias/opciones` — los diccionarios de tipos y estados.
 *
 * **El frontend NO tiene copia de estas listas.** Mismo criterio que
 * `getEstadosOrden`: una lista duplicada a mano falla mudo — se agrega un tipo,
 * el backend lo acepta, el `<select>` no lo ofrece, y ningún test se pone rojo.
 */
export async function getOpcionesCampania() {
  return pedirAutenticado(`${BASE}/campanias/opciones`);
}

export async function crearCampania(datos) {
  return pedirAutenticado(`${BASE}/campanias`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

export async function actualizarCampania(id, datos) {
  return pedirAutenticado(`${BASE}/campanias/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

/**
 * El ON/OFF manual. Va por su propia ruta y no por `actualizarCampania` para
 * que apagar una campaña desde el calendario no tenga que reenviar fechas y
 * textos que nadie está tocando — con el riesgo de pisar con datos viejos lo
 * que otro admin acaba de cambiar.
 */
export async function cambiarEstadoCampania(id, estado) {
  return pedirAutenticado(`${BASE}/campanias/${id}/estado`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ estado }),
  });
}

export async function duplicarCampania(id) {
  return pedirAutenticado(`${BASE}/campanias/${id}/duplicar`, { method: "POST" });
}

export async function eliminarCampania(id) {
  return pedirAutenticado(`${BASE}/campanias/${id}`, { method: "DELETE" });
}

/**
 * Sube o reemplaza el Doodle. Usa el timeout largo de subidas (120 s) y no el
 * de 15 s del resto: una imagen por una conexión lenta tarda más que cualquier
 * request de JSON, y cortarla a los 15 s daría un error que no existe.
 */
export async function subirDoodle(id, archivo) {
  const cuerpo = new FormData();
  cuerpo.append("doodle", archivo);
  return pedirAutenticado(
    `${BASE}/campanias/${id}/doodle`,
    { method: "PUT", body: cuerpo },
    TIMEOUT_SUBIDA_MS,
  );
}

export async function quitarDoodle(id) {
  return pedirAutenticado(`${BASE}/campanias/${id}/doodle`, { method: "DELETE" });
}

/**
 * Qué promociones aplica una campaña mientras está activa.
 *
 * Reemplaza la lista completa. **Desasociar NO borra la promoción**: sigue
 * existiendo con sus productos y sus otras programaciones.
 */
export async function guardarPromocionesDeCampania(id, promocionIds) {
  return pedirAutenticado(`${BASE}/campanias/${id}/promociones`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promocionIds }),
  });
}

/**
 * La VITRINA: qué productos MUESTRA la campaña. Es otra pregunta que qué
 * descuentos aplica, y por eso otro endpoint.
 *
 * Reemplaza la lista completa y **responde el DETALLE entero**, no la lista de
 * ids: el editor pinta cada producto con nombre, precio y portada, así que un
 * segundo GET para dibujar lo que se acaba de guardar sería una request de más
 * y una ventana en la que la vitrina se ve vacía.
 *
 * El tope de productos lo pone y lo rechaza el BACKEND
 * (`MAX_PRODUCTOS_CAMPANIA`). Acá no hay copia de ese número a propósito: sería
 * un espejo manual más, del tipo que se desincroniza sin que nada falle.
 */
export async function guardarProductosDeCampania(id, productIds) {
  return pedirAutenticado(`${BASE}/campanias/${id}/productos`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
}

/**
 * `GET /api/campanias/contador?hasta=AAAA-MM-DD` — cuántos días faltan.
 *
 * **El día lo cuenta el backend, nunca el navegador.** `horarioArgentino.js` es
 * la única definición de "día" del sistema: con la cuenta de este lado, alguien
 * con el reloj corrido vería en la vista previa un número distinto del que el
 * cartel le muestra al visitante.
 */
export async function getContadorCampania(hasta) {
  return pedirAutenticado(`${BASE}/campanias/contador?hasta=${encodeURIComponent(hasta)}`);
}
