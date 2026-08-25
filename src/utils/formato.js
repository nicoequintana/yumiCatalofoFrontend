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
 * Formatea el `precio` de un producto para mostrar, con las convenciones
 * argentinas: punto como separador de miles y SIN decimales
 * (ej. 10000 -> "$ 10.000").
 *
 * Los montos del sistema son enteros — `Product.precio` e
 * `ItemOrden.precioUnitario` son `Decimal(10, 0)` en la base — así que un
 * `,00` fijo al final sería ruido en cada precio de la app.
 * `maximumFractionDigits: 0` igual redondea por las dudas: si llega un valor
 * con parte fraccionaria (una respuesta cacheada de antes de la migración, un
 * promedio calculado en el cliente), es preferible mostrarlo redondeado que
 * con una cola de decimales.
 *
 * `precio` llega como string (así serializa Prisma un `Decimal` sobre JSON en
 * SQL Server), por eso siempre se coerciona antes de formatear en vez de
 * asumir que ya es un número.
 *
 * ESPEJO MANUAL de `formatearMonto` en `backend/src/lib/plantillasEmail.js`,
 * que formatea los mails transaccionales y el precio del HTML que ve un
 * crawler (`controllers/seo.cuerpo.js`). Los dos repos se publican por
 * separado. La cantidad de decimales tiene que coincidir entre las dos: si
 * esta mostrara `"$ 45.000"` y aquella `"$45.000,00"`, el texto que ve un
 * buscador dejaría de coincidir con el que ve una persona, que es justo lo
 * que la regla de cloaking prohíbe.
 *
 * @param {string|number} precio
 * @returns {string} ej. "$ 10.000"
 */
export function formatPrecio(precio) {
  const numero = typeof precio === "number" ? precio : parseFloat(precio);

  if (Number.isNaN(numero)) {
    return "$ 0";
  }

  const formateado = new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(numero);

  return `$ ${formateado}`;
}

/**
 * Formatea lo que se tipea en un campo de precio en vivo: deja solo dígitos,
 * saca los ceros a la izquierda y reinserta los puntos de miles — tipear
 * "10000" muestra "10.000".
 *
 * NO acepta separador decimal de ninguna forma. Los precios son enteros, y un
 * campo que dejara escribir "1500,50" para que el backend lo rechace con un
 * 400 estaría invitando a un error que puede evitar en el momento.
 *
 * Devuelve `formateado` (lo que se muestra en el input) y `crudo` (dígitos
 * pelados, listo para `Number()` o para mandar como query param), así quien lo
 * usa no tiene que revertir el formato.
 *
 * Es la única función de tipeo de precio de la app: absorbió a
 * `formatearPrecioFiltro`, que existía solo porque los filtros de precio ya
 * eran enteros cuando el precio del producto todavía tenía centavos. Sin
 * decimales en ningún lado, las dos hacían exactamente lo mismo.
 *
 * @param {string} valor - valor crudo del input (puede ya traer puntos de una
 *   pasada de formateo anterior)
 * @returns {{ formateado: string, crudo: string }}
 */
export function formatearPrecioInput(valor) {
  const soloDigitos = String(valor).replace(/[^0-9]/g, "").replace(/^0+(?=[0-9])/, "");
  const formateado = soloDigitos === "" ? "" : new Intl.NumberFormat("es-AR").format(Number(soloDigitos));

  return { formateado, crudo: soloDigitos };
}

/**
 * Convierte un `precio` que ya viene del backend (string numérico con punto
 * decimal, ej. `Decimal.toString()` -> "1500") a la forma que necesita el
 * formulario de edición para precargar el campo: `formateado` ("1.500") y
 * `crudo` ("1500", listo para enviar tal cual).
 *
 * NO se reemplaza por `formatearPrecioInput` aunque hoy la entrada sea entera,
 * y la razón es un bug de 100x, no prolijidad. `formatearPrecioInput` tira
 * todo lo que no sea dígito: si alguna vez le llega un "1500.00" —una
 * respuesta cacheada de antes de que los precios fueran enteros, un valor
 * escrito a mano en la base— borraría el punto y precargaría "150000", un
 * precio cien veces mayor que el real, sin error ni aviso. Esta función
 * interpreta el número primero y recién después formatea, así que ese valor
 * precarga "1.500", que es lo correcto.
 *
 * Redondea, porque el campo del formulario no puede representar centavos: es
 * mejor precargar el entero más cercano que dejar el input vacío o con un
 * valor que el backend va a rechazar.
 *
 * @param {string|number} valor - numérico con punto decimal, ej. "1500"
 * @returns {{ formateado: string, crudo: string }}
 */
export function formatearPrecioParaEdicion(valor) {
  const numero = typeof valor === "number" ? valor : parseFloat(valor);

  if (Number.isNaN(numero)) {
    return { formateado: "", crudo: "" };
  }

  const entero = Math.round(numero);
  const formateado = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(entero);

  return { formateado, crudo: String(entero) };
}
