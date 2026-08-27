/**
 * Qué texto de la ficha se va a DIBUJAR dentro de las imágenes que genera n8n.
 *
 * Es un espejo de la lógica del flujo (ver la spec
 * `docs/superpowers/specs/2026-08-27-solapa-imagenes-producto-design.md`, §6.1).
 * Sincronización manual entre repos, mismo criterio que `botDetector.js` ↔
 * `nginx.conf`: si esto y el flujo divergen, el panel muestra algo distinto de
 * lo que sale impreso, que es peor que no mostrar nada.
 *
 * Desde el 27/08/2026 estos campos no son contexto del prompt: se dibujan
 * literales, sin corregir. Por eso el editor los muestra antes de generar.
 */

/** Máximo de frases por imagen, impuesto por el flujo. */
const MAX_POR_IMAGEN = 3;

/**
 * Nombres que identifican una dimensión física cotable. Salen de los datos
 * reales del catálogo, no de una lista imaginada.
 */
const NOMBRES_DIMENSION = new Set([
  "medidas", "medida", "altura", "alto", "ancho", "largo",
  "profundidad", "diametro", "diametros", "espesor",
]);

const UNIDAD_LONGITUD = /\d\s*(cm|mm|m\b|pulgadas?|")/i;

/** Minúsculas y sin acentos, para que "Diámetro" entre por "diametro". */
const plegar = (texto) =>
  String(texto ?? "").trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Una especificación es cota solo si cumple LAS DOS condiciones. Con solo el
 * valor, "Caudal de aire: 88,35 m³/h" se dibujaba como una flecha de cota; con
 * el nombre por inclusión, "Largo del cable" volvía a entrar por la ventana.
 */
const esCota = (spec) =>
  NOMBRES_DIMENSION.has(plegar(spec?.nombre)) && UNIDAD_LONGITUD.test(String(spec?.valor ?? ""));

const largoDe = (spec) => `${spec.nombre}: ${spec.valor}`.length;

export function textoQueSeImprime(producto = {}) {
  const beneficiosCrudos = producto.beneficios?.length ? producto.beneficios : producto.caracteristicas;
  const beneficios = (beneficiosCrudos ?? []).slice(0, MAX_POR_IMAGEN).map((b) => b.texto);

  const specs = producto.especificaciones?.length
    ? producto.especificaciones
    : (producto.caracteristicas ?? []).map((c) => ({ nombre: "", valor: c.texto }));

  // Las cotas conservan el orden del array: es semántico (alto, ancho,
  // profundidad) y reordenarlo sería peor.
  const cotas = specs.filter(esCota).slice(0, MAX_POR_IMAGEN);

  // Los callouts van por longitud ascendente y se toman los más cortos. Un
  // texto largo no se trunca —eso sería reescribir lo que cargó una persona—:
  // se desprioriza, entero.
  const callouts = specs
    .filter((s) => !esCota(s))
    .slice()
    .sort((a, b) => largoDe(a) - largoDe(b))
    .slice(0, MAX_POR_IMAGEN - Math.min(cotas.length, 1));

  return { beneficios, cotas, callouts };
}
