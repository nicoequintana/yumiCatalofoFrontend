import { useDroppable } from "@dnd-kit/core";
import { PREFIJO_TAB } from "./dragOrdenes.js";

/**
 * La barra de estados de mobile: abajo de `lg` se ve UNA columna por vez y
 * estos botones eligen cuál.
 *
 * **Además son la ZONA DE DESTINO del arrastre en celular.** Ahí se ve una sola
 * columna, así que no hay otra columna a la que soltar: arrastrar la tarjeta
 * sobre un tab es lo que la mueve de estado, y abre el mismo diálogo de
 * confirmación que un drop entre columnas en escritorio.
 *
 * En escritorio la barra es `lg:hidden`, o sea que mide 0×0 — y
 * `soloDroppablesVisibles` la descarta por eso, sin ninguna rama por breakpoint.
 * El mismo filtro apaga allá las columnas ocultas de acá.
 *
 * **Es un grupo de botones con `aria-pressed`, NO un `role="tablist"`.** Un
 * tablist de verdad obliga a roving `tabindex`, flechas, Home/End y una
 * relación `tabpanel`/`aria-labelledby` — y acá el "panel" es el contenido
 * principal de la pantalla, no un panel de pestaña. `aria-pressed` describe
 * exactamente lo que pasa (un filtro activo) sin esa infraestructura.
 *
 * El contador de cada botón sale del `total` del servidor, igual que el del
 * encabezado de cada columna: es lo que permite ver desde el tab de Entregadas
 * que hay tres pendientes esperando.
 */
export default function TabsEstadoOrden({ estados, columnas, estadoActivo, onElegir }) {
  return (
    <div
      role="group"
      aria-label="Filtrar por estado"
      className="mb-4 flex gap-2 overflow-x-auto pb-1 lg:hidden"
    >
      {estados.map((estado) => (
        <TabEstado
          key={estado.valor}
          estado={estado}
          total={columnas[estado.valor]?.total ?? 0}
          activo={estado.valor === estadoActivo}
          onElegir={onElegir}
        />
      ))}
    </div>
  );
}

function TabEstado({ estado, total, activo, onElegir }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${PREFIJO_TAB}${estado.valor}` });

  return (
    <button
      ref={setNodeRef}
      type="button"
      aria-pressed={activo}
      onClick={() => onElegir(estado.valor)}
      className={`font-label-sm text-label-sm flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 uppercase tracking-widest transition-colors ${
        activo
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
      } ${isOver ? "ring-2 ring-primary ring-offset-2" : ""}`}
    >
      <span>{estado.etiqueta}</span>
      <span className={activo ? "text-on-primary" : "text-on-surface"}>{total}</span>
    </button>
  );
}
