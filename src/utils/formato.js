/**
 * Formats a product's `precio` for display using Argentine number
 * conventions: dot as thousands separator, comma as decimal separator
 * (e.g. 10000 -> "$ 10.000,00").
 *
 * `precio` is stored as a string (see design D5: mirrors how Prisma `Decimal`
 * serializes to string over JSON on SQL Server), so this always coerces
 * before formatting rather than assuming a number.
 *
 * @param {string|number} precio
 * @returns {string} e.g. "$ 10.000,00"
 */
export function formatPrecio(precio) {
  const numero = typeof precio === "number" ? precio : parseFloat(precio);

  if (Number.isNaN(numero)) {
    return "$ 0,00";
  }

  const formateado = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);

  return `$ ${formateado}`;
}

/**
 * Formats raw user input for a live-typing price field: keeps only digits
 * and (at most) one comma as the decimal separator, then re-inserts dots as
 * thousands separators on the integer part — e.g. typing "10000" shows
 * "10.000", typing "10000,5" shows "10.000,5".
 *
 * Returns the same value split into `formateado` (what to show in the input)
 * and `crudo` (normalized "10000.5" form, dot-decimal, ready for
 * `parseFloat`/submission) so callers don't need to reverse the formatting.
 *
 * @param {string} valor - raw input value (may already contain dots/commas
 *   from a previous formatting pass)
 * @returns {{ formateado: string, crudo: string }}
 */
export function formatearPrecioInput(valor) {
  const soloDigitosYComa = valor.replace(/[^\d,]/g, "");
  const [parteEnteraRaw, ...resto] = soloDigitosYComa.split(",");
  const parteDecimal = resto.join("").slice(0, 2);
  const parteEntera = parteEnteraRaw.replace(/^0+(?=\d)/, "");

  const parteEnteraFormateada = parteEntera === "" ? "" : new Intl.NumberFormat("es-AR").format(Number(parteEntera));

  const formateado = resto.length > 0 ? `${parteEnteraFormateada},${parteDecimal}` : parteEnteraFormateada;
  const crudo = parteEntera === "" ? "" : `${parteEntera}${parteDecimal ? `.${parteDecimal}` : ""}`;

  return { formateado, crudo };
}
