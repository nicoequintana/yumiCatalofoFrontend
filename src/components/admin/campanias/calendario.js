/**
 * La matemática de la grilla del calendario comercial.
 *
 * LA REGLA QUE SOSTIENE TODO ESTE MÓDULO: una fecha de calendario es una
 * ETIQUETA, no un instante. El 15 de septiembre es la casilla del 15 de
 * septiembre para todo el mundo, sin importar dónde esté parado quien mira.
 *
 * Por eso acá se opera con `Date.UTC` y `getUTC*` de punta a punta, nunca con
 * los getters locales. No es una preferencia: `new Date("2026-09-15")` en
 * Argentina da el 14 a las 21:00, y con getters locales esa campaña arrancaría
 * una casilla antes. Es la misma trampa que `utils/formato.js` esquiva
 * descomponiendo las fechas date-only a mano.
 *
 * Las campañas entran y salen como `"YYYY-MM-DD"` —el formato que emite la
 * API— y en ningún momento se convierten a un instante local.
 */

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

/** Los encabezados de la grilla, arrancando en lunes como el resto del país. */
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** `Date` (UTC) → `"YYYY-MM-DD"`. La clave con la que se compara todo. */
export function claveDeDia(fecha) {
  return fecha.toISOString().slice(0, 10);
}

/** `"YYYY-MM-DD"` → `Date` en UTC puro, sin que la zona local intervenga. */
function desdeClave(clave) {
  const [ano, mes, dia] = clave.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** ¿Este día pertenece al mes que se está mostrando? (los vecinos van apagados) */
export function esDelMes(fecha, mes) {
  return fecha.getUTCMonth() === mes;
}

/**
 * ¿Es hoy?
 *
 * `claveHoy` la manda el BACKEND (`GET /campanias/activas`). Mientras no llegó,
 * ninguna casilla se marca: dejar que lo decida el reloj del navegador sería
 * meter una segunda definición de "día" en un sistema que tiene una sola.
 */
export function esHoy(fecha, claveHoy) {
  return Boolean(claveHoy) && claveDeDia(fecha) === claveHoy;
}

/** Avanza o retrocede meses cruzando el año sin quedarse en el mes 12. */
export function desplazarMes({ ano, mes }, delta) {
  const total = ano * 12 + mes + delta;
  return { ano: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

export function etiquetaDeMes({ ano, mes }) {
  return `${NOMBRES_MES[mes]} ${ano}`;
}

/**
 * Las semanas que hay que dibujar para mostrar un mes entero.
 *
 * Devuelve filas de SIETE días arrancando en lunes, completadas con los días
 * de los meses vecinos que hagan falta: una grilla con huecos obligaría a cada
 * celda a saber si existe, y las barras de campaña no tendrían dónde apoyarse.
 */
export function semanasDelMes(ano, mes) {
  const primero = new Date(Date.UTC(ano, mes, 1));

  // `getUTCDay()` da 0 para domingo; acá la semana arranca en lunes, así que el
  // domingo pasa a ser el sexto día y no el primero.
  const desplazamiento = (primero.getUTCDay() + 6) % 7;
  const inicio = new Date(primero.getTime() - desplazamiento * MS_POR_DIA);

  const ultimo = new Date(Date.UTC(ano, mes + 1, 0));
  const diasTotales = Math.round((ultimo.getTime() - inicio.getTime()) / MS_POR_DIA) + 1;
  const semanasNecesarias = Math.ceil(diasTotales / 7);

  return Array.from({ length: semanasNecesarias }, (_, fila) =>
    Array.from(
      { length: 7 },
      (__, columna) => new Date(inicio.getTime() + (fila * 7 + columna) * MS_POR_DIA),
    ),
  );
}

/**
 * Dónde arranca y cuánto ocupa la barra de una campaña DENTRO de una semana.
 *
 * Una campaña puede abarcar varias semanas, así que se calcula tramo por tramo
 * y se recorta a los bordes de la fila: lo que empieza antes del lunes arranca
 * en la columna 1, y lo que termina después del domingo llega hasta la 7.
 *
 * El fin es INCLUSIVO, igual que en el backend: una campaña que termina el 9
 * vale el 9 entero y su barra tiene que llegar hasta esa casilla.
 *
 * @returns {{columna: number, span: number}|null} null si no toca esta semana
 */
export function tramoEnSemana(campania, semana) {
  const desde = desdeClave(campania.desde).getTime();
  const hasta = desdeClave(campania.hasta).getTime();
  const lunes = semana[0].getTime();
  const domingo = semana[6].getTime();

  if (hasta < lunes || desde > domingo) return null;

  const inicio = Math.max(desde, lunes);
  const fin = Math.min(hasta, domingo);

  return {
    // `grid-column` es 1-based, de ahí el +1.
    columna: Math.round((inicio - lunes) / MS_POR_DIA) + 1,
    span: Math.round((fin - inicio) / MS_POR_DIA) + 1,
  };
}

/**
 * Los tramos a dibujar en una semana, ya repartidos en carriles.
 *
 * Las campañas se superponen a propósito (una estacional con una fecha especial
 * adentro es el caso normal), así que dos barras que comparten días no pueden
 * ir en la misma línea. El reparto es greedy: cada campaña baja al primer
 * carril donde no choca con nada.
 *
 * El carril se REUTILIZA apenas queda libre — una campaña que terminó el
 * miércoles no le reserva alto al resto de la fila. Sin eso, un mes cargado
 * crecería en alto por campañas que ya pasaron.
 *
 * Se resuelve en JavaScript y no con el auto-placement de CSS Grid a propósito:
 * el algoritmo del navegador hace algo parecido, pero depende de detalles
 * sutiles del modo sparse y no hay forma de afirmarlo en un test.
 *
 * @returns {Array<{campania: object, columna: number, span: number, carril: number}>}
 */
export function tramosDeLaSemana(campanias, semana) {
  const carriles = [];

  return (campanias ?? []).reduce((tramos, campania) => {
    const tramo = tramoEnSemana(campania, semana);
    if (!tramo) return tramos;

    const fin = tramo.columna + tramo.span - 1;
    let carril = carriles.findIndex((ocupadoHasta) => ocupadoHasta < tramo.columna);
    if (carril === -1) carril = carriles.length;
    carriles[carril] = fin;

    tramos.push({ campania, ...tramo, carril });
    return tramos;
  }, []);
}
