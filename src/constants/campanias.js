/**
 * Presentación de los estados de campaña.
 *
 * Mismo reparto que `constants/ordenes.js`: acá viven SOLO los estilos y el
 * ícono. Las etiquetas legibles ("Habilitada", "Activa") las emite el backend
 * en cada respuesta (`etiquetaEstado`, `etiquetaTemporal`) y no hay copia de
 * ese diccionario de este lado — agregar un estado se toca en un solo archivo,
 * que es `backend/src/lib/campanias.js`.
 *
 * Una campaña tiene DOS ejes (el administrativo y el temporal), pero una barra
 * del calendario es una sola cosa. `claveVisual` los colapsa en los cinco
 * estados que una persona necesita distinguir de un vistazo.
 */

/**
 * Cada estado se distingue por color, ÍCONO y texto — nunca por color solo.
 * Un calendario que solo cambia de tono deja afuera a quien no distingue esos
 * tonos, y encima se vuelve ilegible impreso o en una captura en blanco y negro.
 */
export const ESTILOS_CAMPANIA = {
  ACTIVA: {
    barra: "bg-primary text-on-primary",
    punto: "bg-primary",
    icono: "bolt",
  },
  PROGRAMADA: {
    barra: "bg-secondary-container text-on-secondary-container",
    punto: "bg-secondary",
    icono: "schedule",
  },
  FINALIZADA: {
    barra: "bg-surface-container text-on-surface-variant",
    punto: "bg-outline",
    icono: "history",
  },
  BORRADOR: {
    barra: "border border-dashed border-outline bg-surface-container-lowest text-on-surface-variant",
    punto: "bg-outline-variant",
    icono: "edit_note",
  },
  DESHABILITADA: {
    barra: "bg-surface-container text-on-surface-variant line-through decoration-1",
    punto: "bg-error",
    icono: "pause_circle",
  },
};

export const ESTILO_CAMPANIA_POR_DEFECTO = ESTILOS_CAMPANIA.BORRADOR;

/**
 * Las promociones programadas se ven DISTINTO de las campañas, no solo de otro
 * color: son otra cosa. Una campaña es una experiencia comercial completa; una
 * promoción programada es un descuento con fecha. El borde punteado y el ícono
 * de etiqueta las separan de un vistazo, sin depender del tono.
 */
export const ESTILOS_PROGRAMACION = {
  HABILITADA: {
    barra: "border border-dashed border-primary bg-primary/15 text-on-surface",
    icono: "sell",
  },
  DESHABILITADA: {
    barra: "border border-dashed border-outline bg-surface-container text-on-surface-variant line-through decoration-1",
    icono: "sell",
  },
};

export function estiloDeProgramacion(programacion) {
  return programacion?.habilitada
    ? ESTILOS_PROGRAMACION.HABILITADA
    : ESTILOS_PROGRAMACION.DESHABILITADA;
}

/**
 * Los dos ejes colapsados en la clave visual que se muestra.
 *
 * El orden importa: el eje ADMINISTRATIVO gana. Una campaña deshabilitada en
 * pleno período se ve como apagada y no como activa, que es exactamente lo que
 * el admin quiso al apagarla — mostrarla verde porque "está en fecha" sería
 * contradecir la acción que acaba de hacer.
 */
export function claveVisual(campania) {
  if (campania?.estado === "BORRADOR") return "BORRADOR";
  if (campania?.estado === "DESHABILITADA") return "DESHABILITADA";
  return campania?.estadoTemporal ?? "BORRADOR";
}

export function estiloDeCampania(campania) {
  return ESTILOS_CAMPANIA[claveVisual(campania)] ?? ESTILO_CAMPANIA_POR_DEFECTO;
}
