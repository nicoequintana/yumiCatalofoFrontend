import { useId, useRef } from "react";
import { Link } from "react-router-dom";
import { useDraggable } from "@dnd-kit/core";
import { formatFecha, formatPrecio } from "../../../utils/formato.js";
import ResumenOrden from "./ResumenOrden.jsx";

/**
 * Una orden dentro del tablero.
 *
 * **La tarjeta ENTERA se arrastra**, sin manijón. Hubo una versión con manijón
 * y se descartó: era un blanco chico para el gesto más frecuente de la
 * pantalla, y sus dos motivos técnicos se disolvieron solos — el `<select>` de
 * estado ya no existe (una orden cambia de estado moviéndola) y el arrastre en
 * celular quedó cubierto por otro lado (`soloDroppablesVisibles` y los tabs
 * como zona de destino, ver `dragOrdenes.js`).
 *
 * **Convive con un `<Link>` adentro gracias a la `activationConstraint` de 8 px
 * del `PointerSensor`**: un click limpio no llega a mover el puntero, así que
 * "Ver" y el botón de resumen siguen funcionando. Es el mismo trato que hace
 * cualquier kanban.
 *
 * ⚠️ **El `role` que trae dnd-kit se PISA a propósito.** Sus `attributes`
 * incluyen `role="button"`, y este elemento contiene un enlace y un botón: un
 * botón que anida controles interactivos es ARIA inválido y confunde la
 * navegación por teclado. Lo que sí se conserva es el `tabIndex` —el sensor de
 * teclado necesita un elemento enfocable— y el `aria-roledescription`, que es
 * lo que le dice a un lector de pantalla que esto se arrastra.
 *
 * **Sin apertura por hover.** El resumen se abre solo al tocar su botón: un
 * panel que aparecía al pasar por encima tapaba las tarjetas de al lado y
 * competía con el gesto de arrastre, que empieza en el mismo lugar.
 */
export default function TarjetaOrden({
  orden,
  resumenAbierto,
  onAlternarResumen,
  arrastrando = false,
  decorativa = false,
}) {
  const idPanel = useId();
  const botonResumenRef = useRef(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    // El clon del `DragOverlay` lleva un id propio y va deshabilitado: con el
    // mismo id habría dos draggables registrados para la misma orden.
    id: decorativa ? `overlay-${orden.id}` : orden.id,
    disabled: decorativa,
    // La columna de origen viaja con la tarjeta: así `onDragEnd` la sabe sin
    // tener que recorrer las cuatro columnas buscando dónde estaba.
    data: { estadoActual: orden.estado },
  });

  // `total: null` significa "no se puede saber", nunca "$ 0" — mismo guion
  // largo que usan las pantallas de analytics para una métrica no calculable.
  const montoFormateado =
    orden.total === null || orden.total === undefined ? "—" : formatPrecio(orden.total);

  const estilo = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  /**
   * Escape cierra el panel de resumen.
   *
   * ⚠️ **Vive en un contenedor interno, JAMÁS en el `<article>`.** Desde que la
   * tarjeta entera es el área de arrastre, el `onKeyDown` del `<article>` es el
   * activador del `KeyboardSensor` de dnd-kit; declarar uno propio ahí lo pisa
   * y mata el camino de teclado entero. Componerlos tampoco sirve —se probó—:
   * durante un arrastre en curso el foco sigue en la tarjeta, así que el
   * activador se volvería a invocar en cada tecla y el Space que suelta nunca
   * se procesa como soltado.
   *
   * Acá abajo el problema no existe: dnd-kit no escucha en este nodo.
   */
  function escaparResumen(evento) {
    if (evento.key !== "Escape" || !resumenAbierto) return;
    evento.stopPropagation();
    onAlternarResumen(null);
    botonResumenRef.current?.focus();
  }

  const enMovimiento = isDragging || arrastrando;

  return (
    <article
      ref={setNodeRef}
      style={estilo}
      {...listeners}
      {...attributes}
      // ⚠️ NO agregar un `onKeyDown` propio acá: pisaría el activador del
      // sensor de teclado de dnd-kit. Ver `escaparResumen`.
      // Ver el aviso del docblock: el `role="button"` de dnd-kit se descarta
      // porque esta tarjeta contiene un enlace y un botón.
      role={undefined}
      // Marcador para el listener de "tocar afuera" que vive en el tablero:
      // un pointerdown dentro de cualquier tarjeta no cierra el panel.
      data-tarjeta-orden=""
      // El clon que dibuja el `DragOverlay` es una COPIA VISUAL: sale del árbol
      // de accesibilidad y del tabulado. Sin esto queda una segunda tarjeta
      // enfocable con el mismo contenido mientras dura el arrastre —y su
      // animación de soltado—, así que el teclado pasa dos veces por la misma
      // orden y un lector de pantalla la anuncia duplicada. Mismo criterio que
      // el juego duplicado de `CarruselDestacados`.
      {...(decorativa ? { "aria-hidden": "true", inert: true, tabIndex: -1 } : {})}
      // `relative` porque el panel de resumen se ancla acá.
      className={`relative rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-ambient ${
        decorativa ? "cursor-grabbing" : "cursor-grab active:cursor-grabbing"
      } ${enMovimiento ? "opacity-40" : ""}`}
    >
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-label-md text-label-md text-on-surface-variant">#{orden.id}</span>
          <strong className="font-label-md text-label-md text-primary">{montoFormateado}</strong>
        </div>
        <p className="font-body-md text-body-md break-words text-on-surface">
          {orden.cliente?.nombre ?? "Sin cliente"}
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {formatFecha(orden.createdAt)}
        </p>
      </div>

      {/* El Escape del resumen se maneja acá y no en el `<article>`, que es el
          activador del sensor de teclado de dnd-kit. Ver `escaparResumen`. */}
      <div onKeyDown={escaparResumen}>
        <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          ref={botonResumenRef}
          type="button"
          aria-expanded={resumenAbierto}
          aria-controls={idPanel}
          aria-label={`Ver los ${orden.cantidadItems ?? 0} productos de la orden #${orden.id}`}
          onClick={() => onAlternarResumen(orden.id)}
          className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg px-2 text-on-surface-variant hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            list_alt
          </span>
          <span className="font-label-sm text-label-sm">{orden.cantidadItems ?? "—"}</span>
        </button>

        <Link
          to={`/catalogo/admin/ordenes/${orden.id}`}
          aria-label={`Ver la orden #${orden.id}`}
          className="font-label-sm text-label-sm ml-auto inline-flex h-9 cursor-pointer items-center rounded-lg px-2 uppercase tracking-widest text-primary hover:bg-surface-container"
        >
          Ver
        </Link>
        </div>

        {resumenAbierto ? (
          <ResumenOrden
            id={idPanel}
            resumen={orden.resumen}
            cantidadItems={orden.cantidadItems}
            montoFormateado={montoFormateado}
          />
        ) : null}
      </div>
    </article>
  );
}
