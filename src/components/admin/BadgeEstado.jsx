import {
  ESTILOS_ESTADO,
  ESTILO_ESTADO_POR_DEFECTO,
} from "../../constants/ordenes.js";

/**
 * Badge de estado. Nació como la única representación visual del estado en
 * las tablas de órdenes del admin, y su default sigue siendo el de ese
 * dominio: `ESTILOS_ESTADO` (`constants/ordenes.js`).
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
 * `estilos` es el escape para un dominio AJENO a órdenes (campañas,
 * promociones, …): sus claves de estado no matchean ninguna de
 * `ESTILOS_ESTADO` y todo caería al gris por defecto, anulando la
 * distinción visual que el badge existe para dar. El consumidor pasa su
 * propio mapa `{clave: clases}` en vez de sumar sus claves a
 * `constants/ordenes.js`, que es solo de órdenes y no tiene por qué
 * conocer un estado de campaña.
 *
 * @param {{estado: string, etiqueta?: string, estilos?: Record<string, string>}} props
 */
function BadgeEstado({ estado, etiqueta, estilos = ESTILOS_ESTADO }) {
  return (
    <span
      className={`font-label-sm text-label-sm inline-block rounded px-2 py-1 uppercase tracking-wide ${
        estilos[estado] ?? ESTILO_ESTADO_POR_DEFECTO
      }`}
    >
      {etiqueta ?? estado}
    </span>
  );
}

export default BadgeEstado;
