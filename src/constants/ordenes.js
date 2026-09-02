/**
 * ESTILOS de los estados de una orden — y solo los estilos.
 *
 * Este archivo era el espejo manual completo de `backend/src/lib/estadosOrden.js`
 * (lista de estados, etiquetas, terminales), y había que tocarlo en los DOS
 * repos al agregar un estado. Desde el 02/09/2026 todo lo SEMÁNTICO viene del
 * backend: las etiquetas viajan con cada orden (`estadoEtiqueta`) y con los
 * desgloses de analytics, y la lista completa —con bandera `terminal`— la sirve
 * `GET /ordenes/estados` (ver `getEstadosOrden` en `api/ordenes.js`).
 *
 * Lo que queda acá es PRESENTACIÓN: qué colores lleva cada estado. Eso sí es
 * asunto de este repo — el backend no sabe de Tailwind — y se queda indexado
 * por la clave cruda, que es la única parte del contrato que ambos comparten.
 *
 * Un estado que el backend agregue y estos mapas no conozcan cae al estilo
 * neutro (`ESTILO_ESTADO_POR_DEFECTO`): la fila queda gris pero legible, nunca
 * en blanco.
 */
export const ESTILOS_ESTADO = {
  PENDIENTE: "bg-surface-container-high text-on-surface-variant",
  EN_PREPARACION: "bg-tertiary-container text-on-tertiary-container",
  ENTREGADA: "bg-secondary text-on-primary",
  CANCELADA: "bg-error-container text-on-error-container",
};

export const ESTILO_ESTADO_POR_DEFECTO = "bg-surface-container-high text-on-surface-variant";
