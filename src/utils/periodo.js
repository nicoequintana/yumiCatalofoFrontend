/** Milisegundos en un día. */
export const MS_POR_DIA = 24 * 60 * 60 * 1000;

/** `Date` -> "YYYY-MM-DD", el formato que espera el backend. */
export function aClaveDia(fecha) {
  return fecha.toISOString().slice(0, 10);
}

/**
 * Rango [hoy - (dias-1), hoy], ambos inclusive, en claves "YYYY-MM-DD".
 *
 * Es el rango que las cuatro pantallas de analytics (`ventas`, `embudo`,
 * `clientes`, `operacion`) le mandan al backend como `desde`/`hasta`. Vive acá
 * una sola vez para que las cuatro pidan exactamente la misma ventana: cuatro
 * copias del mismo cálculo son cuatro oportunidades de que los números de dos
 * pantallas dejen de cuadrar entre sí.
 *
 * @param {number} dias - largo de la ventana, incluyendo hoy
 * @returns {{desde: string, hasta: string}}
 */
export function calcularRango(dias) {
  const hoy = new Date();
  const hasta = new Date(`${aClaveDia(hoy)}T00:00:00.000Z`);
  const desde = new Date(hasta.getTime() - (dias - 1) * MS_POR_DIA);
  return { desde: aClaveDia(desde), hasta: aClaveDia(hasta) };
}
