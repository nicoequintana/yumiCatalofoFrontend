/**
 * La hora de Argentina y la ventana de las pantallas de analytics.
 *
 * ESPEJO MANUAL de `backend/src/lib/horarioArgentino.js`. Los dos repos se
 * publican por separado (ver "Deploy" en CLAUDE.md), así que no hay forma de
 * compartir el módulo: son dos copias de la misma definición de "día", con la
 * misma tabla de casos en los tests de cada lado. Es la misma sincronización
 * manual que ya tienen `lib/slug.js` ↔ `utils/slug.js` y
 * `lib/precios.js` ↔ `utils/precios.js`.
 *
 * **Si las dos copias divergen, no falla nada y los números quedan mal.** Este
 * archivo CONSTRUYE las claves `desde`/`hasta` que el backend INTERPRETA: si
 * una habla de días UTC y la otra de días argentinos, entre las 21:00 y la
 * medianoche local la ventana pedida se corre un día entero hacia adelante — el
 * último punto de la serie temporal es un día futuro garantizado vacío y el día
 * más viejo del período se pierde en silencio. Justo la franja en la que más se
 * compra.
 */

/** Milisegundos en un día. */
export const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Argentina está en UTC-3 fijo: no aplica horario de verano desde 2009, así
 * que el desplazamiento es una constante y no hace falta una base de zonas
 * horarias para resolverlo.
 */
export const DESFASE_ARGENTINA_MS = -3 * 60 * 60 * 1000;

/**
 * Desplaza un instante a la hora de Argentina para poder leer sus partes con
 * los getters `getUTC*`.
 *
 * NO se usa la hora LOCAL del navegador (`getDate`, `getFullYear`), que es lo
 * que hace `utils/formato.js`: ahí es correcto —una fecha se le muestra a quien
 * la mira, en su reloj—, pero acá la clave viaja al backend, que la lee como un
 * día del calendario argentino. Un admin de viaje, o una máquina con la zona
 * mal configurada, pediría una ventana distinta de la que ve rotulada. Por eso
 * no se reutiliza `partesLocales` de `formato.js`: resuelven preguntas
 * distintas, no es la misma función escrita dos veces.
 *
 * Tampoco `Intl.DateTimeFormat`, por el mismo motivo que `formatearMonto` no
 * usa `Intl.NumberFormat`: la salida depende de la versión de ICU del runtime.
 *
 * @param {Date|string|number|null|undefined} valor
 * @returns {Date|null} null si el valor falta o no es una fecha legible
 */
export function enHorarioArgentino(valor) {
  if (valor === null || valor === undefined) return null;
  const fecha = valor instanceof Date ? valor : new Date(valor);
  const instante = fecha.getTime();
  if (Number.isNaN(instante)) return null;
  return new Date(instante + DESFASE_ARGENTINA_MS);
}

/**
 * Instante → `"YYYY-MM-DD"` del día ARGENTINO al que pertenece.
 *
 * Es la clave que el backend espera en `desde`/`hasta`. Con
 * `toISOString().slice(0, 10)` a secas —que es lo que hacía este módulo hasta
 * que el backend pasó a interpretar las claves en hora argentina— el "hoy" del
 * navegador ya era mañana en Argentina durante toda la franja de 21:00 a 24:00,
 * y la ventana entera se corría un día.
 *
 * @param {Date|string|number} valor
 * @returns {string}
 */
export function claveDiaArgentino(valor) {
  return enHorarioArgentino(valor).toISOString().slice(0, 10);
}

/**
 * `"YYYY-MM-DD"` (día argentino) → el instante UTC de SU medianoche.
 *
 * Es la contraparte exacta de `claveDiaArgentino`, y acá adentro es lo que
 * permite restar días sin salirse del calendario argentino: anclar la resta en
 * la medianoche UTC de la clave (lo que hacía la versión anterior) y volver a
 * pasarla por `claveDiaArgentino` devolvería el día ANTERIOR, porque el desfase
 * la empuja para atrás.
 *
 * @param {string} clave - `"YYYY-MM-DD"`
 * @returns {Date|null} null si la clave no es una fecha legible
 */
export function inicioDelDiaArgentino(clave) {
  const medianoche = new Date(`${clave}T00:00:00.000Z`);
  if (Number.isNaN(medianoche.getTime())) return null;
  // Se RESTA el desfase (que es negativo), o sea se suman 3 horas: la
  // medianoche del 15 en Buenos Aires es el 15 a las 03:00 UTC.
  return new Date(medianoche.getTime() - DESFASE_ARGENTINA_MS);
}

/**
 * Rango [hoy - (dias-1), hoy], ambos inclusive, en claves "YYYY-MM-DD" del
 * calendario ARGENTINO.
 *
 * Es el rango que las cuatro pantallas de analytics (`ventas`, `embudo`,
 * `clientes`, `operacion`) le mandan al backend como `desde`/`hasta`. Vive acá
 * una sola vez para que las cuatro pidan exactamente la misma ventana: cuatro
 * copias del mismo cálculo son cuatro oportunidades de que los números de dos
 * pantallas dejen de cuadrar entre sí.
 *
 * La resta de días se hace sobre el instante que devuelve
 * `inicioDelDiaArgentino`, no sobre una medianoche UTC armada a mano: las dos
 * puntas del rango tienen que estar en el mismo calendario que el backend usa
 * para agrupar.
 *
 * @param {number} dias - largo de la ventana, incluyendo hoy
 * @returns {{desde: string, hasta: string}}
 */
export function calcularRango(dias) {
  const hasta = claveDiaArgentino(new Date());
  const desde = claveDiaArgentino(inicioDelDiaArgentino(hasta).getTime() - (dias - 1) * MS_POR_DIA);
  return { desde, hasta };
}
