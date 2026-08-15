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
