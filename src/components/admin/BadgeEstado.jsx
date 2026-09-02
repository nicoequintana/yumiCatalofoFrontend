import {
  ESTILOS_ESTADO,
  ESTILO_ESTADO_POR_DEFECTO,
} from "../../constants/ordenes.js";

/**
 * Badge de estado de una orden. Es la única representación visual del estado en
 * las tablas de órdenes del admin.
 *
 * LA ETIQUETA VIENE DEL DATO (`orden.estadoEtiqueta`, o `etiqueta` en los
 * desgloses de analytics): el frontend ya no tiene su propia copia del
 * diccionario de estados — era un espejo manual entre repos que había que tocar
 * de a dos. `estado` sigue siendo la clave de los ESTILOS, que sí son
 * presentación y por eso viven de este lado.
 *
 * Sin etiqueta (un dato viejo, una respuesta cacheada) se muestra la clave
 * cruda: fea pero legible. Un badge vacío sería un bug silencioso.
 *
 * @param {{estado: string, etiqueta?: string}} props
 */
function BadgeEstado({ estado, etiqueta }) {
  return (
    <span
      className={`font-label-sm text-label-sm inline-block rounded px-2 py-1 uppercase tracking-wide ${
        ESTILOS_ESTADO[estado] ?? ESTILO_ESTADO_POR_DEFECTO
      }`}
    >
      {etiqueta ?? estado}
    </span>
  );
}

export default BadgeEstado;
