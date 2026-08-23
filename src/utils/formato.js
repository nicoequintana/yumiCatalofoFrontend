/**
 * Marcador único de "no hay dato" para fechas. Es el mismo guion largo que ya
 * usan las pantallas de analytics para una métrica no calculable: una fecha
 * ilegible se muestra, no se esconde detrás de un string vacío.
 */
const SIN_DATO = "—";

/**
 * Fecha sin hora (`YYYY-MM-DD`), el shape que devuelven los endpoints de
 * analytics del admin. Se detecta a propósito para NO pasarla nunca por
 * `new Date()`: el parser de ECMAScript trata ese formato como medianoche UTC,
 * así que en Argentina (UTC-3) `new Date("2026-08-19")` cae el 18 a las 21 h y
 * la pantalla mostraría el día anterior.
 */
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Formas ISO incompletas (`"2026"`, `"2026-08"`). `Date` las acepta y las
 * interpreta como UTC, con el mismo corrimiento de día que `SOLO_FECHA` evita:
 * `new Date("2026-08")` en Argentina cae el 31/07. Se rechazan en vez de
 * completarlas al día 1, porque el backend nunca manda ese shape y asumir un
 * día sería inventar dato. Reemplaza al viejo guard `length < 10` que tenía la
 * copia de `AdminEmbudo`.
 */
const FECHA_ISO_INCOMPLETA = /^\d{4}(-\d{2})?$/;

function dosDigitos(numero) {
  return String(numero).padStart(2, "0");
}

/**
 * Descompone una fecha en sus partes locales ya rellenadas a dos dígitos, o
 * `null` si el valor no representa una fecha.
 *
 * Se usan los getters locales (`getDate`, `getHours`, …) en vez de un
 * `Intl.DateTimeFormat` cacheado a nivel de módulo: un formateador creado al
 * importar congela la zona horaria del momento del import, y el relleno a dos
 * dígitos queda a merced del locale en vez de ser explícito.
 *
 * @param {string|number|Date} valor
 * @returns {{dia: string, mes: string, anio: string, hora: string, minuto: string, segundo: string}|null}
 */
function partesLocales(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  if (typeof valor === "string") {
    const soloFecha = SOLO_FECHA.exec(valor);
    if (soloFecha) {
      const [, anio, mes, dia] = soloFecha;
      return { dia, mes, anio, hora: "00", minuto: "00", segundo: "00" };
    }
    if (FECHA_ISO_INCOMPLETA.test(valor)) return null;
  }

  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;

  return {
    dia: dosDigitos(fecha.getDate()),
    mes: dosDigitos(fecha.getMonth() + 1),
    anio: String(fecha.getFullYear()),
    hora: dosDigitos(fecha.getHours()),
    minuto: dosDigitos(fecha.getMinutes()),
    segundo: dosDigitos(fecha.getSeconds()),
  };
}

/**
 * Formatea una fecha como `dd/mm/aaaa` — el único formato de fecha de la app.
 *
 * Acepta indistintamente un timestamp ISO (`"2026-08-19T14:03:22Z"`, lo que
 * devuelven `createdAt`/`updatedAt`) y una fecha sin hora (`"2026-08-19"`, lo
 * que devuelven los endpoints de analytics), sin correr el día en ninguno de
 * los dos casos. Día y mes van siempre con dos dígitos: `toLocaleDateString`
 * los devuelve sin rellenar (`19/8/2026`) y eso hacía que la misma fecha se
 * viera distinta según la pantalla.
 *
 * @param {string|number|Date} valor
 * @returns {string} `"19/08/2026"`, o `"—"` si el valor no es una fecha
 */
export function formatFecha(valor) {
  const partes = partesLocales(valor);
  if (partes === null) return SIN_DATO;
  return `${partes.dia}/${partes.mes}/${partes.anio}`;
}

/**
 * Formatea una fecha con hora como `dd/mm/aaaa, hh:mm:ss` (reloj de 24 h, hora
 * local). Mismo criterio de entrada y de fallback que `formatFecha`: una fecha
 * sin hora se toma como medianoche local, no como medianoche UTC.
 *
 * @param {string|number|Date} valor
 * @returns {string} `"19/08/2026, 14:03:22"`, o `"—"` si el valor no es una fecha
 */
export function formatFechaHora(valor) {
  const partes = partesLocales(valor);
  if (partes === null) return SIN_DATO;
  return `${partes.dia}/${partes.mes}/${partes.anio}, ${partes.hora}:${partes.minuto}:${partes.segundo}`;
}

/**
 * Convierte un precio (string/number, mirror de Prisma `Decimal`) a centavos
 * enteros, redondeando al centavo más cercano.
 *
 * Acumular en centavos (enteros) en vez de en floats decimales evita el drift
 * de punto flotante al sumar varias líneas (`0.10 + 0.20 + 0.30 !== 0.60`). El
 * resultado se vuelve a pasar a pesos una sola vez, al formatear el total.
 *
 * Vive acá, junto a `formatPrecio`, y no duplicada por pantalla: es la única
 * función del proyecto donde una divergencia entre copias le muestra al cliente
 * un total equivocado.
 *
 * @param {string|number} precio
 * @returns {number} centavos, 0 si el precio no es un número válido
 */
export function precioACentavos(precio) {
  const numero = typeof precio === "number" ? precio : parseFloat(precio);
  if (Number.isNaN(numero)) return 0;
  return Math.round(numero * 100);
}

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
