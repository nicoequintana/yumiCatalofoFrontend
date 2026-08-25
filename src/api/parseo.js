/**
 * Parseo defensivo del cuerpo de una respuesta HTTP.
 *
 * Todos los clientes de `src/api` leen el cuerpo como texto y lo parsean como
 * JSON. Cuando el backend está caído detrás de un proxy (nginx/EasyPanel), el
 * cuerpo del 502/504 es HTML — un `JSON.parse` desnudo ahí lanza SyntaxError
 * y ese error, no el mensaje amigable, es lo que llega a la pantalla.
 *
 * @param {string} texto cuerpo crudo de la respuesta (`await res.text()`)
 * @returns {object|null} el objeto parseado, o `null` si el texto está vacío
 *   o no es JSON válido. El patrón `body?.error ?? mensajeGenérico` de los
 *   call sites hace el resto: con `null` cae solo al mensaje genérico.
 */
export function parsearCuerpo(texto) {
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}
