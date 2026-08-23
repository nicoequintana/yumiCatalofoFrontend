/**
 * Los cinco estados de una `Orden`, en el orden real del flujo de trabajo:
 * PENDIENTE → CONFIRMADA → EN_PREPARACION → ENTREGADA, con CANCELADA como
 * salida posible desde cualquier punto.
 *
 * El orden importa: es el que usan tanto los `<select>` de estado como las
 * tarjetas de conteo de `AdminOperacion`, y espeja el enum del backend.
 */
export const ESTADOS_ORDEN = [
  "PENDIENTE",
  "CONFIRMADA",
  "EN_PREPARACION",
  "ENTREGADA",
  "CANCELADA",
];

/**
 * Estados no terminales: los únicos en los que una orden todavía requiere
 * trabajo, y por lo tanto los únicos con antigüedad sin cambios que reportar.
 */
export const ESTADOS_NO_TERMINALES = ["PENDIENTE", "CONFIRMADA", "EN_PREPARACION"];

/**
 * Etiquetas legibles. El backend siempre devuelve las claves crudas.
 *
 * ESPEJO MANUAL de `backend/src/lib/estadosOrden.js`'s `ETIQUETA_ESTADO`, que
 * las necesita para el asunto y el cuerpo de los mails de cambio de estado.
 * Al agregar un estado, tocar los dos.
 */
export const ETIQUETA_ESTADO = {
  PENDIENTE: "Pendiente",
  CONFIRMADA: "Confirmada",
  EN_PREPARACION: "En preparación",
  ENTREGADA: "Entregada",
  CANCELADA: "Cancelada",
};

/**
 * Estilos de badge por estado — combinaciones del paletón del proyecto, cada
 * una claramente distinguible de las demás. Solo tokens semánticos: el modo
 * oscuro del admin se resuelve redefiniendo las custom properties, así que un
 * color literal acá sería lo único capaz de romperlo.
 */
export const ESTILOS_ESTADO = {
  PENDIENTE: "bg-surface-container-high text-on-surface-variant",
  CONFIRMADA: "bg-secondary-container text-on-secondary-container",
  EN_PREPARACION: "bg-tertiary-container text-on-tertiary-container",
  ENTREGADA: "bg-secondary text-on-primary",
  CANCELADA: "bg-error-container text-on-error-container",
};

/** Estilo de reserva para un estado que el backend agregue antes que la UI. */
export const ESTILO_ESTADO_POR_DEFECTO = "bg-surface-container-high text-on-surface-variant";
