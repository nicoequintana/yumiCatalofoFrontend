import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import ColumnaOrdenes from "./ColumnaOrdenes.jsx";
import TabsEstadoOrden from "./TabsEstadoOrden.jsx";
import TarjetaOrden from "./TarjetaOrden.jsx";
import {
  ACTIVACION_ARRASTRE,
  PREFIJO_TAB,
  coordenadasPorColumna,
  previsualizarMovimiento,
  resolverSoltar,
  soloDroppablesVisibles,
} from "./dragOrdenes.js";

/**
 * El tablero: una columna por estado, con arrastre entre columnas.
 *
 * **No hace fetch ni conoce la API.** Los datos entran por `columnas` (los
 * arma `useColumnasOrdenes`) y todo movimiento sale por `onMovimiento`, que la
 * pantalla convierte en el diálogo de notificación de siempre.
 *
 * **Los tabs viven acá adentro y no en la pantalla**, aunque visualmente estén
 * arriba de la grilla: son la zona de destino del arrastre en celular, y
 * `useDroppable` solo funciona dentro del `DndContext`.
 *
 * **Sin movimiento optimista, a propósito.** Soltar una tarjeta no confirma
 * nada: abre un modal con tres salidas, y "Cancelar" es de primera clase — es
 * cómo se sale de un drop equivocado. El movimiento real recién ocurre cuando
 * el PATCH responde. Lo que SÍ pasa mientras el modal está abierto es que la
 * tarjeta se dibuja en su columna destino (`previsualizarMovimiento`): sin eso
 * se la ve volver a la columna original detrás del modal, que es el gesto
 * contrario al que la persona acaba de hacer. Es puramente derivado, así que
 * cancelar lo revierte solo.
 */
export default function TableroOrdenes({
  estados,
  columnas,
  estadoActivo,
  movimientoPendiente,
  onElegirTab,
  onCargarMas,
  onReintentar,
  onMovimiento,
}) {
  const [ordenArrastrada, setOrdenArrastrada] = useState(null);
  const [resumenAbiertoId, setResumenAbiertoId] = useState(null);
  const arrastrandoRef = useRef(false);

  const sensores = useSensors(
    // Ver `ACTIVACION_ARRASTRE`: sin umbral, el click del enlace "Ver" y el
    // del botón de resumen no llegan nunca.
    useSensor(PointerSensor, { activationConstraint: ACTIVACION_ARRASTRE }),
    // ⚠️ El `coordinateGetter` tampoco es opcional: el default del
    // KeyboardSensor mueve la tarjeta 25 px por flecha, pensado para listas
    // ordenables. En un tablero de columnas anchas eso no llega ni a salir de
    // la columna de origen, y el camino de teclado —que es por lo que se sumó
    // esta dependencia— queda inservible sin que nada falle.
    useSensor(KeyboardSensor, { coordinateGetter: coordenadasPorColumna }),
  );

  const etiquetaDe = useCallback(
    (valor) => {
      const clave = String(valor).replace(PREFIJO_TAB, "");
      return estados.find((e) => e.valor === clave)?.etiqueta ?? clave;
    },
    [estados],
  );

  /**
   * Los anuncios de dnd-kit vienen en inglés por default. Todo el proyecto
   * está en castellano, y este es justamente el camino por el que se aceptó
   * sumar la dependencia — dejarlos en inglés sería perder lo que se compró.
   */
  const anuncios = {
    onDragStart: ({ active }) => `Levantaste la orden número ${active.id}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `La orden número ${active.id} está sobre ${etiquetaDe(over.id)}.`
        : `La orden número ${active.id} no está sobre ninguna columna.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `Soltaste la orden número ${active.id} en ${etiquetaDe(over.id)}.`
        : `Soltaste la orden número ${active.id} fuera del tablero. No se movió.`,
    onDragCancel: ({ active }) => `Cancelaste el movimiento de la orden número ${active.id}.`,
  };

  /**
   * Un solo panel de resumen abierto en todo el tablero.
   *
   * Vive acá y no como un booleano por tarjeta para que no se puedan apilar
   * cuatro paneles a la vez, y para que el listener de "tocar afuera" sea uno
   * solo en vez de uno por tarjeta.
   */
  const alternarResumen = useCallback((id) => {
    if (arrastrandoRef.current) return;
    if (id === null) {
      setResumenAbiertoId(null);
      return;
    }
    setResumenAbiertoId((actual) => (actual === id ? null : id));
  }, []);

  // Tocar afuera cierra. UN listener, instalado solo mientras hay un panel
  // abierto — uno por tarjeta serían N listeners sobre `document`.
  useEffect(() => {
    if (resumenAbiertoId === null) return undefined;
    function alTocarAfuera(evento) {
      if (!evento.target.closest?.("[data-tarjeta-orden]")) setResumenAbiertoId(null);
    }
    document.addEventListener("pointerdown", alTocarAfuera);
    return () => document.removeEventListener("pointerdown", alTocarAfuera);
  }, [resumenAbiertoId]);

  function alEmpezarArrastre({ active }) {
    arrastrandoRef.current = true;
    setResumenAbiertoId(null);
    setOrdenArrastrada(Number(active.id));
  }

  function alTerminarArrastre({ active, over }) {
    arrastrandoRef.current = false;
    setOrdenArrastrada(null);
    const movimiento = resolverSoltar(active, over);
    if (movimiento) onMovimiento(movimiento);
  }

  function alCancelarArrastre() {
    arrastrandoRef.current = false;
    setOrdenArrastrada(null);
  }

  // La tarjeta ya se dibuja en su columna destino mientras el modal decide.
  const columnasEnPantalla = previsualizarMovimiento(columnas, movimientoPendiente);

  const ordenEnVuelo =
    ordenArrastrada === null
      ? null
      : Object.values(columnasEnPantalla)
          .flatMap((columna) => columna.ordenes)
          .find((orden) => orden.id === ordenArrastrada);

  return (
    <DndContext
      sensors={sensores}
      // ⚠️ El envoltorio es lo que hace inofensivo el arrastre en celular y lo
      // que apaga los tabs en escritorio, con un solo mecanismo y sin ninguna
      // rama por breakpoint. Ver `soloDroppablesVisibles`.
      collisionDetection={soloDroppablesVisibles(closestCorners)}
      accessibility={{ announcements: anuncios }}
      onDragStart={alEmpezarArrastre}
      onDragEnd={alTerminarArrastre}
      onDragCancel={alCancelarArrastre}
    >
      <TabsEstadoOrden
        estados={estados}
        columnas={columnasEnPantalla}
        estadoActivo={estadoActivo}
        onElegir={onElegirTab}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {estados.map((estado) => (
          <ColumnaOrdenes
            key={estado.valor}
            estado={estado}
            // Las CUATRO columnas se montan siempre, incluso abajo de `lg`
            // donde solo una se ve: hacen falta las cuatro respuestas para que
            // los contadores de los tabs digan la verdad. Se ocultan por CSS y
            // no con `matchMedia`, que sería el primer breakpoint en JS del
            // proyecto — algo que el plan del admin responsive descartó.
            className={estado.valor === estadoActivo ? "" : "hidden lg:flex"}
            columna={
              columnasEnPantalla[estado.valor] ?? {
                ordenes: [],
                total: 0,
                cargando: true,
                error: null,
              }
            }
            onCargarMas={onCargarMas}
            onReintentar={onReintentar}
            resumenAbiertoId={resumenAbiertoId}
            onAlternarResumen={alternarResumen}
            ordenArrastrada={ordenArrastrada}
          />
        ))}
      </div>

      {/* Sin overlay, la tarjeta se mueve por `transform` dentro de su columna
          y cualquier contenedor con overflow la recorta a mitad del gesto.

          `dropAnimation={null}`: la animación por defecto devuelve el clon
          volando a su posición original, y eso es justo lo que NO tiene que
          verse — la tarjeta ya quedó dibujada en su columna destino.

          Va `decorativa`: es una copia VISUAL de una tarjeta que sigue montada
          en su columna, así que tiene que quedar fuera del árbol de
          accesibilidad y del tabulado. */}
      <DragOverlay dropAnimation={null}>
        {ordenEnVuelo ? (
          <TarjetaOrden
            orden={ordenEnVuelo}
            resumenAbierto={false}
            onAlternarResumen={() => {}}
            decorativa
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
