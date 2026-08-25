/**
 * Copy del hero de la home (`Catalogo.jsx`).
 *
 * Las señales de confianza se renderizan en DOS lugares: una fila en línea
 * bajo los CTA en escritorio y una tarjeta flotante sobre el pie de la foto en
 * móvil. Son dos nodos distintos porque la fila vive en la columna de texto y
 * la tarjeta en la de la foto — con una sola grilla no hay forma de mover un
 * único nodo entre las dos columnas. Que el texto viva acá es lo que evita que
 * las dos copias se separen: cambiar una etiqueta las cambia en los dos lados.
 *
 * Cada nodo se oculta con `hidden` / `lg:hidden`, no con `aria-hidden`: un
 * elemento con `display: none` sale del árbol de accesibilidad, así que un
 * lector de pantalla recorre la lista una sola vez, la que corresponde al
 * ancho actual.
 *
 * Las dos formas no muestran lo mismo, y no es una omisión:
 *
 * - `soloEscritorio` deja afuera de la tarjeta el ítem más largo. La tarjeta
 *   mide el ancho de un teléfono menos sus márgenes; con los cuatro ítems se
 *   parte en dos renglones y deja de leerse como un pie de una línea.
 * - `textoCompacto` acorta las etiquetas que sí entran en las dos.
 * - El ícono se repite en dos ítems a propósito: la fila en línea muestra el
 *   ícono SOLO del primero, así que el de "Útiles" solo aparece en la tarjeta,
 *   donde ese ítem es el que abre la lista.
 */
export const SENALES_CONFIANZA = [
  { icono: "verified_user", texto: "Productos seleccionados", soloEscritorio: true },
  { icono: "verified_user", texto: "Útiles" },
  { texto: "Diferentes" },
  { icono: "redeem", texto: "Para vos o para regalar", textoCompacto: "Para regalar" },
];
