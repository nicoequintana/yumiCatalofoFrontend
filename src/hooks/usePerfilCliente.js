import { useEffect, useState } from "react";
import { fetchConTimeout } from "../api/http.js";
import { parsearCuerpo } from "../api/parseo.js";
import { reiniciarPedidosCliente } from "./usePedidosCliente.js";

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000"}/api/cuenta`;

/**
 * El perfil de la cuenta de cliente, cacheado a nivel de módulo — mismo patrón
 * de listeners que `useContextoComercial.js`, pero SIN keyear por token: acá no
 * hay token que leer, la sesión vive en una cookie `httpOnly` que el frontend
 * no puede inspeccionar. Por eso tampoco se mira `exp`: la autoridad sobre
 * "¿hay sesión?" es siempre `GET /api/cuenta`.
 *
 * DIFERENCIA con `useContextoComercial`, que cachea para toda la carga de
 * página: acá la deduplicación es **por tanda de montajes**, no por página.
 * `promesaEnVuelo` se suelta al terminar la request, así que un montaje
 * POSTERIOR revalida contra el backend. Es a propósito y es lo que hace que
 * `invalidarPerfil()` funcione sin disparar nada por su cuenta: una campaña de
 * temporada puede quedar vieja hasta un F5, una sesión vencida no.
 *
 * `RequireAuthCliente` es el único consumidor que decide navegación a partir de
 * esto; `MiCuenta.jsx` y `Checkout.jsx` lo leen para mostrar datos.
 *
 * POR QUÉ NO PASA POR `pedirCliente` (`api/clienteAuth.js`): ese cliente
 * redirige a `/cuenta/entrar` ante `SESION_INVALIDA`, y acá un 401 es el estado
 * NORMAL de un visitante anónimo que nunca inició sesión. Con `pedirCliente`,
 * cualquiera navegando el catálogo público terminaría pateado al login antes de
 * que `RequireAuthCliente` llegue a decidir nada. El guard decide, no el
 * cliente de fetch.
 *
 * Los tres estados terminales se distinguen a propósito (regla del proyecto:
 * "falló la carga" nunca es lo mismo que "no hay nada"):
 * - `{ perfil: null, resuelto: true, error: null }` → anónimo, se SABE que no
 *   hay sesión. El guard manda a login.
 * - `{ perfil: {...}, resuelto: true, error: null }` → hay sesión.
 * - `{ perfil: null, resuelto: true, error: "..." }` → NO se sabe (red caída o
 *   503). El guard muestra el error con "Reintentar", nunca el login: mandar a
 *   login acá le haría creer a alguien con sesión válida que se le venció.
 */
const ESTADO_VACIO = { perfil: null, resuelto: false, error: null };

const MENSAJE_ERROR = "No pudimos verificar tu sesión.";

let perfilActual = ESTADO_VACIO;
let promesaEnVuelo = null;
const listeners = new Set();

/**
 * Generación del cache. Cada invalidación, refresco o reinicio la incrementa, y
 * una carga vieja que llega tarde compara antes de notificar.
 *
 * Sin esto, la respuesta de un fetch ya descartado —el de antes de un logout, o
 * el del test anterior del mismo archivo— pisaría el estado nuevo: anular
 * `promesaEnVuelo` corta la deduplicación, no la promesa ya en vuelo.
 */
let generacion = 0;

function notificar(estado) {
  perfilActual = estado;
  listeners.forEach((listener) => listener(estado));
}

/**
 * Dispara la carga, o devuelve la que ya está en vuelo: tres componentes
 * montados en el mismo tick producen UNA request, no tres.
 */
function cargar() {
  if (promesaEnVuelo) return promesaEnVuelo;

  const generacionPropia = generacion;
  const vigente = () => generacionPropia === generacion;

  promesaEnVuelo = fetchConTimeout(BASE, { credentials: "include" })
    .then(async (res) => {
      const cuerpo = parsearCuerpo(await res.text());
      if (!vigente()) return;

      if (res.status === 401) {
        // Sin sesión NO es un error: es el estado normal de un visitante que
        // nunca inició sesión. `RequireAuthCliente` decide qué hacer con
        // `perfil: null`; acá no se juzga.
        notificar({ perfil: null, resuelto: true, error: null });
        return;
      }

      if (!res.ok) {
        notificar({ perfil: null, resuelto: true, error: cuerpo?.error ?? MENSAJE_ERROR });
        return;
      }

      notificar({ perfil: cuerpo, resuelto: true, error: null });
    })
    .catch(() => {
      // `resuelto` pasa a true igual: sin eso, "todavía no llegó" y "falló y no
      // va a llegar" serían el mismo estado y el guard dejaría el spinner
      // girando para siempre.
      if (vigente()) notificar({ perfil: null, resuelto: true, error: MENSAJE_ERROR });
    })
    .finally(() => {
      if (vigente()) promesaEnVuelo = null;
    });

  return promesaEnVuelo;
}

/**
 * Devuelve `{ perfil, resuelto, error }`. `perfil` es el cuerpo tal cual lo
 * emite `GET /api/cuenta` (`{id, email, origenRegistro, nombre, telefono, dni,
 * tieneGoogle, tienePassword}`), sin recortar ni recalcular nada: el dato
 * derivado lo resuelve el backend.
 */
export default function usePerfilCliente() {
  const [estado, setEstado] = useState(perfilActual);

  useEffect(() => {
    listeners.add(setEstado);

    // Si el valor ya llegó mientras este componente no estaba montado, se toma
    // del cache en vez de esperar una notificación que no va a volver a pasar.
    if (perfilActual !== estado) setEstado(perfilActual);

    cargar();

    return () => {
      listeners.delete(setEstado);
    };
    // Solo al montar: `estado` se lee para el realineado inicial y volver a
    // correr el efecto en cada cambio de valor re-registraría el listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return estado;
}

/**
 * Invalida el cache sin disparar un fetch nuevo. Toda escritura de perfil
 * (login, completar datos, cambiar email o contraseña, logout) llama a esto:
 * sin invalidar, `/cuenta/completar` escribe y la pantalla siguiente seguiría
 * viendo `nombre: null` — el loop guard ↔ completar que describe la spec.
 *
 * El fetch nuevo lo dispara el próximo MONTAJE de `usePerfilCliente` (una
 * navegación, típicamente), porque `promesaEnVuelo` quedó en `null`.
 */
export function invalidarPerfil() {
  generacion += 1;
  promesaEnVuelo = null;
  // Login, logout o una sesión que venció son los tres casos en que la
  // CUENTA detrás de este navegador pudo cambiar: el cache de
  // `usePedidosCliente` es por sesión, y sin esto la próxima cuenta que entre
  // vería, por un instante, los pedidos de la anterior.
  reiniciarPedidosCliente();
  notificar(ESTADO_VACIO);
}

/**
 * Fuerza un fetch nuevo YA, sin esperar un remontaje. Lo usa el botón
 * "Reintentar" del guard, que está parado en una pantalla que no va a
 * remontarse sola.
 */
export function refrescarPerfil() {
  generacion += 1;
  promesaEnVuelo = null;
  notificar({ ...perfilActual, resuelto: false });
  return cargar();
}

/**
 * Mete en el cache un perfil que el servidor ACABA de devolver: sin refetch y,
 * sobre todo, SIN bajar `resuelto`.
 *
 * `refrescarPerfil()` no sirve para esto. Deja `resuelto:false`, y la PRIMERA
 * rama de `RequireAuthCliente` es `if (!resuelto) return <Spinner/>`: la
 * pantalla que acaba de escribir se desmonta en ese mismo repintado y se lleva
 * puesto su `setAviso`/`setActualizada`, que estaban batcheados en el mismo
 * tick. En la app se veía un parpadeo de spinner, el formulario volvía
 * remontado con los valores nuevos y ningún acuse de recibo.
 *
 * `invalidarPerfil()` tampoco: deja `ESTADO_VACIO` (o sea `resuelto:false`) y
 * no dispara ningún fetch, así que la pantalla montada queda con el spinner
 * girando para siempre.
 *
 * Lo que sí corresponde es esto, y no es solo por el aviso: el perfil
 * actualizado YA viene en la respuesta del PUT, así que volver a pedirlo es un
 * viaje de más contra un dato que ya se tiene — regla 1 del proyecto, el dato
 * derivado viaja en la respuesta y el frontend no lo re-pide.
 *
 * Incrementa `generacion` por el mismo motivo que las otras dos: una carga
 * vieja que llegue tarde compara antes de notificar y no pisa esto.
 *
 * @param {object} perfil el cuerpo tal cual lo devolvió el endpoint.
 */
export function sincronizarPerfil(perfil) {
  generacion += 1;
  promesaEnVuelo = null;
  // `error: null` a propósito: si el PUT respondió, la sesión está viva. Dejar
  // un error viejo mandaría al guard a la pantalla de "no pudimos verificar tu
  // sesión" justo después de una escritura exitosa.
  notificar({ perfil, resuelto: true, error: null });
}

/**
 * Vuelve el módulo a cero. **Helper de tests**, mismo criterio que
 * `reiniciarContextoComercial`: el estado a nivel de módulo sobrevive entre
 * casos del mismo archivo, y sin esto el segundo test heredaría el cache, la
 * promesa y los listeners del primero.
 */
export function _reiniciarParaTests() {
  generacion += 1;
  perfilActual = ESTADO_VACIO;
  promesaEnVuelo = null;
  listeners.clear();
}
