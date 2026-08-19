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

/**
 * Converts an already-valid backend `precio` value (dot-decimal string, e.g.
 * Prisma `Decimal.toString()` -> "1500.00" or "1500") into the shape the edit
 * form needs to prefill the price field: `formateado` (comma-decimal display,
 * e.g. "1.500,00") and `crudo` (dot-decimal, ready for submission as-is).
 *
 * This is a prefill-only conversion, distinct from `formatearPrecioInput`:
 * that function parses raw, possibly-partial keystroke input (comma-decimal,
 * digits typed live) and would corrupt an already-normalized dot-decimal
 * value (e.g. "1500.00" -> strips the "." as a non-digit/non-comma char ->
 * "150000" -> displayed as "150.000", a 100x price bug). Use this function
 * whenever prefilling from a trusted backend value instead.
 *
 * @param {string} valor - backend dot-decimal numeric string, e.g. "1500.00"
 * @returns {{ formateado: string, crudo: string }}
 */
/**
 * Formats raw user input for a live-typing integer-only price filter (e.g.
 * catalog min/max price): keeps only digits, strips leading zeros, and
 * re-inserts dots as thousands separators — e.g. typing "10000" shows
 * "10.000". No decimal separator is ever accepted.
 *
 * Returns `formateado` (what to show in the input) and `crudo` (plain digit
 * string, ready for `Number()`/submission as a query param).
 *
 * @param {string} valor - raw input value (may already contain dots from a
 *   previous formatting pass)
 * @returns {{ formateado: string, crudo: string }}
 */
export function formatearPrecioFiltro(valor) {
  const soloDigitos = valor.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const formateado = soloDigitos === "" ? "" : new Intl.NumberFormat("es-AR").format(Number(soloDigitos));

  return { formateado, crudo: soloDigitos };
}

export function formatearPrecioParaEdicion(valor) {
  const numero = typeof valor === "number" ? valor : parseFloat(valor);

  if (Number.isNaN(numero)) {
    return { formateado: "", crudo: "" };
  }

  const formateado = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numero);

  const crudo = numero.toFixed(2);

  return { formateado, crudo };
}
