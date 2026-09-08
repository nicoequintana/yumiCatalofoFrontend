/**
 * Extensión del área táctil hasta el mínimo de 44×44 (WCAG 2.5.8) SIN cambiar
 * el tamaño VISIBLE del control.
 *
 * Nació dentro de `BotonFavorito.jsx` y se mudó acá el 07/09/2026, cuando la
 * auditoría de área efectiva encontró el mismo problema en una veintena de
 * controles del panel y del público: dejarla en un componente habría obligado
 * a copiar la incantación de pseudo-elemento en cada consumidor, que es
 * exactamente la clase de duplicación que este repo trata como regresión.
 *
 * ⚠️ **La caja declarada NO es el área táctil.** Medido en navegador el
 * 07/09/2026 con `elementFromPoint` (no con `getBoundingClientRect`): el
 * corazón de la tarjeta mide 34×34 de caja y 44×44 de área efectiva, y está
 * BIEN. Antes de agrandar algo hay que medir el área efectiva, no la caja.
 *
 * ## Cuál de las dos herramientas usar
 *
 * - **`AREA_TACTIL` (pseudo-elemento)** cuando agrandar la caja rompería el
 *   diseño: iconos dentro de una tarjeta angosta, celdas densas de una tabla,
 *   texto en línea. El dibujo se queda donde está y solo crece el blanco de
 *   click. **Ojo con los vecinos**: dos controles a menos de 44px de paso
 *   terminan con las áreas superpuestas y el segundo le roba área al primero.
 *   Ahí hay que separar o agrandar de verdad.
 * - **`min-h-11 min-w-11`** cuando el control puede crecer sin costo (un botón
 *   suelto, un campo de formulario). Va **ADEMÁS** del tamaño de la variante,
 *   nunca en lugar de él: el mínimo táctil es un PISO y la variante sigue
 *   decidiendo cuánto crece por encima (ver `SelectorCantidad.jsx`).
 *
 * `content-['']` no es decorativo: sin él el pseudo-elemento no genera caja y
 * el área táctil sigue siendo la de antes, sin que nada falle y sin que ningún
 * test se ponga en rojo.
 *
 * `AREA_TACTIL` fija solo el ALTO. El ancho lo elige el consumidor, porque son
 * dos casos distintos:
 *
 * - `before:w-full` cuando el control ya es más ancho que 44 (texto, una fila
 *   entera): copia el ancho propio y no invade lo que tenga al lado.
 * - `before:w-11` cuando el control es un ícono angosto y hay que estirar
 *   también el ancho.
 */
export const AREA_TACTIL =
  "relative before:absolute before:left-1/2 before:top-1/2 before:h-11 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']";

/** `AREA_TACTIL` + ancho propio: para controles que ya sobran de ancho. */
export const AREA_TACTIL_ANCHA = `${AREA_TACTIL} before:w-full`;

/** `AREA_TACTIL` + 44 de ancho: para íconos sueltos más angostos que 44. */
export const AREA_TACTIL_ICONO = `${AREA_TACTIL} before:w-11`;
