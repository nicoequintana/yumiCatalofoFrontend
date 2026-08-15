/**
 * Formats a product's `precio` for display.
 *
 * `precio` is stored as a string (see design D5: mirrors how Prisma `Decimal`
 * serializes to string over JSON on SQL Server), so this always coerces
 * before formatting rather than assuming a number.
 *
 * @param {string|number} precio
 * @returns {string} e.g. "$145.00"
 */
export function formatPrecio(precio) {
  const numero = typeof precio === "number" ? precio : parseFloat(precio);

  if (Number.isNaN(numero)) {
    return "$0.00";
  }

  return `$${numero.toFixed(2)}`;
}
