import { useEffect, useState } from "react";
import { getContextoComercial } from "../api/campanias.js";
import { getToken } from "../api/authClient.js";

/**
 * El contexto comercial activo: qué campaña está mandando ahora mismo sobre la
 * experiencia del catálogo.
 *
 * POR QUÉ ESTE PATRÓN Y NO EL DE `useWhatsapp`. Ese hook fetchea una vez POR
 * INSTANCIA, sin deduplicar: cada `BotonWhatsapp` montado dispara su propia
 * request. Es tolerable con un solo consumidor, pero acá hay tres —el navbar
 * (Doodle), el modal, y el banner cuando exista— y todos preguntan lo mismo.
 * Con ese patrón cada carga de página pagaría tres requests idénticas.
 *
 * Así que se usa el patrón module-level del resto del proyecto
 * (`useCarrito`/`useFavoritos`/`useTemaAdmin`): un valor cacheado a nivel de
 * módulo, un set de listeners, y una única promesa en vuelo de la que se
 * cuelgan todos los montajes concurrentes.
 *
 * DIFERENCIA con esos tres: la fuente no es `localStorage` sino la API, así que
 * no hay evento `storage` ni sincronización entre pestañas. El contexto se
 * carga UNA VEZ por carga de página completa, igual que `BarraAnuncios`.
 *
 * Consecuencia asumida: una campaña que arranca a las 00:00 no aparece hasta
 * que el visitante recargue. Es correcto para lo que esto hace —decoración de
 * temporada— y evita un polling que le pegaría a la base cada N segundos por
 * cada persona navegando el catálogo.
 */

/**
 * El estado "no hay ninguna campaña", que es también el estado inicial.
 *
 * `doodleAdmin` solo lo puebla una respuesta con sesión de admin: es el Doodle
 * que la campaña eligió mostrar puertas adentro, y para un anónimo no existe.
 */
const CONTEXTO_VACIO = {
  doodle: null,
  doodleAdmin: null,
  modal: null,
  claveDia: null,
  resuelto: false,
};

let contextoActual = CONTEXTO_VACIO;
let promesaEnVuelo = null;
const listeners = new Set();

/**
 * El token con el que se pidió el contexto cacheado.
 *
 * **El cache depende de la identidad, así que tiene que estar keyeado por
 * ella.** La pantalla de login vive dentro del `Layout` público, o sea que el
 * navbar dispara el primer fetch SIN token y el backend omite `doodleAdmin` a
 * propósito. Loguearse es `setToken` + `navigate`: navegación SPA, sin recarga.
 * Con un cache ciego a esto, el contexto anónimo quedaba vigente para toda la
 * sesión y **el Doodle del panel no se veía nunca**, salvo que alguien apretara
 * F5. El camino inverso es igual de malo: el contexto con `doodleAdmin` no
 * puede sobrevivir a un logout.
 */
let tokenDelCache = null;

function notificar(contexto) {
  contextoActual = contexto;
  listeners.forEach((listener) => listener(contexto));
}

/**
 * Dispara la carga, o devuelve la que ya está en vuelo.
 *
 * El `promesaEnVuelo` es lo que hace que tres componentes montados en el mismo
 * tick produzcan UNA request y no tres.
 */
function cargar() {
  const token = getToken();

  // Cambió quién pregunta: lo cacheado ya no es la respuesta correcta.
  if (promesaEnVuelo && token !== tokenDelCache) {
    promesaEnVuelo = null;
    contextoActual = CONTEXTO_VACIO;
  }
  if (promesaEnVuelo) return promesaEnVuelo;

  tokenDelCache = token;
  promesaEnVuelo = getContextoComercial()
    .then((contexto) => {
      notificar({
        doodle: contexto?.doodle ?? null,
        doodleAdmin: contexto?.doodleAdmin ?? null,
        modal: contexto?.modal ?? null,
        claveDia: contexto?.claveDia ?? null,
        resuelto: true,
      });
    })
    .catch(() => {
      // Falla BLANDA, igual que la cinta de anuncios: esto es decoración de
      // temporada. Un backend caído tiene que dejar el logo de marca y el sitio
      // andando, nunca tumbar el catálogo. No se reintenta: un reintento por
      // instancia multiplicaría las requests contra un backend que ya está en
      // problemas.
      //
      // Pero `resuelto` SÍ pasa a true. Sin eso, "todavía no llegó" y "falló y
      // no va a llegar" serían el mismo estado, y una pantalla que espere
      // `claveDia` para dibujarse dejaría el spinner girando para siempre.
      notificar({ ...CONTEXTO_VACIO, resuelto: true });
    });

  return promesaEnVuelo;
}

/**
 * Devuelve `{ doodle, claveDia }` del contexto comercial vigente.
 *
 * `doodle` es `null` mientras no haya campaña activa que lo aporte — el caso
 * normal— y también mientras la primera carga está en vuelo, para que el logo
 * de marca no parpadee.
 */
export default function useContextoComercial() {
  const [contexto, setContexto] = useState(contextoActual);

  useEffect(() => {
    listeners.add(setContexto);

    // Si el valor ya llegó mientras este componente no estaba montado, se toma
    // del cache en vez de esperar una notificación que no va a volver a pasar.
    if (contextoActual !== contexto) setContexto(contextoActual);

    cargar();

    return () => {
      listeners.delete(setContexto);
    };
    // Solo al montar: `contexto` se lee para el realineado inicial y volver a
    // correr el efecto en cada cambio de valor re-registraría el listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return contexto;
}

/**
 * Vuelve el módulo a cero. **Helper de tests**, con el mismo criterio que
 * `limpiarTema` en `useTemaAdmin`: el estado a nivel de módulo sobrevive entre
 * casos del mismo archivo, y sin esto el segundo test heredaría el cache y la
 * promesa del primero.
 */
export function reiniciarContextoComercial() {
  contextoActual = CONTEXTO_VACIO;
  promesaEnVuelo = null;
  tokenDelCache = null;
  listeners.clear();
}
