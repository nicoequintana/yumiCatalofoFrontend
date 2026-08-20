/**
 * Id local para items que todavía no existen en la base.
 *
 * Se usa como `key` de React mientras el item vive solo en el formulario.
 * Antes se armaba con `Date.now()`, que colisiona cuando se agregan dos
 * items dentro del mismo milisegundo: dos keys iguales hacen que React
 * renderice uno solo, en silencio. Es alcanzable manteniendo Enter, y lo
 * sería de forma trivial el día que se pueda pegar varias líneas juntas.
 *
 * El prefijo `tmp-` es parte del contrato con el backend: distingue un item
 * nuevo de uno ya persistido, cuyo id es numérico.
 */
export function nuevoIdTemporal() {
  return `tmp-${crypto.randomUUID()}`;
}
