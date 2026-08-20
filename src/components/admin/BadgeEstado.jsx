import {
  ESTILOS_ESTADO,
  ESTILO_ESTADO_POR_DEFECTO,
  ETIQUETA_ESTADO,
} from "../../constants/ordenes.js";

/**
 * Badge de estado de una orden. Es la única representación visual del estado en
 * las tablas de órdenes del admin: antes el listado lo mostraba con badge y el
 * tablero de operación como texto plano, así que el mismo dato se leía distinto
 * según la pantalla.
 *
 * Un estado desconocido se muestra con su clave cruda y el estilo neutro, en vez
 * de quedar en blanco: si el backend agrega un estado antes que la UI, la fila
 * sigue siendo legible.
 *
 * @param {{estado: string}} props
 */
function BadgeEstado({ estado }) {
  return (
    <span
      className={`font-label-sm text-label-sm inline-block rounded px-2 py-1 uppercase tracking-wide ${
        ESTILOS_ESTADO[estado] ?? ESTILO_ESTADO_POR_DEFECTO
      }`}
    >
      {ETIQUETA_ESTADO[estado] ?? estado}
    </span>
  );
}

export default BadgeEstado;
