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
 *
 * **`valor` / `etiqueta` (14/09/2026).** El selector mostraba el nombre técnico
 * en inglés, que para quien opera el panel no dice nada. `valor` es lo que se
 * GUARDA en `Categoria.icono` (el nombre de Material Symbols, sin cambios de
 * contrato); `etiqueta` es solo lo que se lee.
 */
export const ICONOS_CATEGORIA = [
  { valor: "restaurant", etiqueta: "Cocina / restaurante" },
  { valor: "chair", etiqueta: "Silla / muebles" },
  { valor: "watch", etiqueta: "Reloj / accesorios" },
  { valor: "devices", etiqueta: "Tecnología" },
  { valor: "spa", etiqueta: "Bienestar / spa" },
  { valor: "light", etiqueta: "Iluminación" },
  { valor: "pets", etiqueta: "Mascotas" },
  { valor: "toys", etiqueta: "Juguetes" },
  { valor: "checkroom", etiqueta: "Ropa / percheros" },
  { valor: "sports_soccer", etiqueta: "Deportes" },
  { valor: "local_florist", etiqueta: "Flores / plantas" },
  { valor: "yard", etiqueta: "Jardín / exterior" },
  { valor: "kitchen", etiqueta: "Electrodomésticos" },
  { valor: "weekend", etiqueta: "Living / sillones" },
];
