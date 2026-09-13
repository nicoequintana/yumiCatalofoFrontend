/**
 * Lista CERRADA de Material Symbols para el selector de ícono de categoría.
 *
 * Presentación pura: no hay endpoint de "opciones" del backend porque
 * `Categoria.icono` acepta cualquier `VarChar(40)` (un nombre inexistente
 * simplemente no pinta nada, ver el comentario de `LARGO_MAX_ICONO` en
 * `categorias.controller.js`) — mismo criterio que la lista acotada vive acá
 * y no en el backend, porque es una restricción de UX del panel, no una
 * regla de negocio a validar server-side.
 *
 * **Historia:** este selector existió, se sacó el 06/09/2026 cuando los
 * círculos de la home pasaron a mostrar la FOTO de la categoría (revert
 * `9e2ce61`), y volvió el 13/09/2026 cuando el mockup aprobado del rediseño
 * de la home (`docs/superpowers/specs/2026-09-13-rediseno-home-publica-design.md`,
 * §3 "Círculos de categoría") decidió ícono + color en vez de foto — esa
 * decisión supersede al revert de 09/06. Si esto vuelve a discutirse, la
 * fuente de verdad es esa spec, no el commit del 06/09.
 */
export const ICONOS_CATEGORIA = [
  "restaurant",
  "chair",
  "watch",
  "devices",
  "spa",
  "light",
  "pets",
  "toys",
  "checkroom",
  "sports_soccer",
  "local_florist",
  "yard",
  "kitchen",
  "weekend",
];
