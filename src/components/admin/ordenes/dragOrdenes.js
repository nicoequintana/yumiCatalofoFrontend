/**
 * Lógica pura del arrastre del tablero de órdenes.
 *
 * Existe separada de `TableroOrdenes.jsx` porque **es lo único del drag que se
 * puede testear en jsdom**. El arrastre en sí no: jsdom no implementa
 * `PointerEvent` ni `setPointerCapture` (el `PointerSensor` de dnd-kit no
 * arranca), y aunque el `KeyboardSensor` sí recibe los eventos, dnd-kit mide
 * los droppables con `getBoundingClientRect`, que en jsdom devuelve todo cero
 * — la detección de colisión resuelve degeneradamente y un test así pasaría o
 * fallaría por motivos que no tienen nada que ver con este código.
 *
 * El gesto real se cubre en Playwright; acá se cubre la decisión.
 */

/**
 * Prefijo del id de los tabs como zona de destino.
 *
 * Abajo de `lg` se ve una columna por vez, así que **no hay otra columna a la
 * que arrastrar**: los tabs son el destino ahí. Necesitan un id propio porque
 * dos droppables no pueden compartir el mismo — la columna "ENTREGADA" y el tab
 * "Entregada" conviven en el DOM al mismo tiempo.
 */
export const PREFIJO_TAB = "tab:";

/**
 * Cuánto hay que mover el puntero para que empiece un arrastre.
 *
 * ⚠️ **No es opcional y no es un ajuste fino.** La tarjeta ENTERA es el área de
 * arrastre y contiene un `<Link>` ("Ver") y un `<button>` (el resumen): sin
 * umbral, el `pointerdown` sobre cualquiera de ellos arranca el gesto y el
 * click **nunca llega**. Con 8 px, un click limpio no mueve el puntero lo
 * suficiente y los controles siguen funcionando.
 *
 * Vive acá y no inline en `TableroOrdenes` para que los tests puedan montar el
 * MISMO `DndContext` que la pantalla real. Con un `<DndContext>` pelado, el
 * PointerSensor por defecto no tiene umbral y los tests miden un componente que
 * no es el que se usa.
 */
export const ACTIVACION_ARRASTRE = { distance: 8 };

/**
 * Qué hacer con un `onDragEnd` de dnd-kit.
 *
 * @param {{id: string|number, data?: {current?: {estadoActual?: string}}}|null} active
 *   La tarjeta arrastrada.
 * @param {{id: string|number}|null} over La columna —o el tab— donde se soltó.
 * @returns {{ordenId: number, origen: string, destino: string}|null}
 *   El movimiento a confirmar, o `null` si no hay nada que hacer.
 */
export function resolverSoltar(active, over) {
  // Soltó fuera de toda zona: no es un error ni un movimiento, es una
  // cancelación. No abre el diálogo.
  if (!active || !over) return null;

  // Un tab y su columna representan el MISMO estado: se normaliza acá para que
  // el resto del sistema no tenga que saber por dónde entró el gesto.
  const destino = String(over.id).replace(PREFIJO_TAB, "");
  const origen = active.data?.current?.estadoActual;
  if (!origen) return null;

  // Soltó en la misma columna de la que salió. Preguntarle al admin si quiere
  // notificar un cambio que no cambia nada sería ruido puro.
  if (destino === origen) return null;

  const ordenId = Number(active.id);
  if (!Number.isInteger(ordenId)) return null;

  return { ordenId, origen, destino };
}

/**
 * Movimiento por teclado entre COLUMNAS, no de a 25 píxeles.
 *
 * ⚠️ **El `coordinateGetter` por defecto del `KeyboardSensor` de
 * `@dnd-kit/core` mueve la tarjeta 25 px por flecha.** Ese default está pensado
 * para listas ordenables, donde 25 px cruzan un ítem; en un tablero de columnas
 * anchas, una flecha derecha ni siquiera sale de la columna de origen y el
 * camino de teclado queda inservible — sin error y sin nada que lo delate salvo
 * probarlo.
 *
 * Acá cada flecha horizontal salta al CENTRO de la columna vecina, que es lo
 * que un usuario de teclado espera de un kanban. Las flechas verticales no se
 * usan: dentro de una columna no hay orden que elegir.
 *
 * Se cubre con Playwright, no con Vitest: en jsdom `getBoundingClientRect`
 * devuelve todo cero y los rects de las columnas serían indistinguibles.
 */
export function coordenadasPorColumna(evento, { context }) {
  const { droppableContainers, droppableRects, collisionRect } = context;
  if (!collisionRect) return undefined;

  const horizontal = { ArrowRight: 1, ArrowLeft: -1 }[evento.code];
  if (!horizontal) return undefined;

  // Las zonas que se VEN, ordenadas como aparecen en pantalla. El filtro de
  // área es el mismo criterio que `soloDroppablesVisibles`: en escritorio deja
  // afuera a los tabs (`lg:hidden`), y abajo de `lg` a las tres columnas
  // ocultas. Sin él, una flecha llevaría la tarjeta a una zona invisible.
  const columnas = droppableContainers
    .getEnabled()
    .map((contenedor) => ({ id: contenedor.id, rect: droppableRects.get(contenedor.id) }))
    .filter((columna) => columna.rect && columna.rect.width > 0 && columna.rect.height > 0)
    .sort((a, b) => a.rect.left - b.rect.left);

  if (columnas.length === 0) return undefined;

  // La columna actual es aquella cuyo centro está más cerca del centro de la
  // tarjeta en vuelo.
  const centroActual = collisionRect.left + collisionRect.width / 2;
  let indice = 0;
  let mejorDistancia = Infinity;
  columnas.forEach((columna, i) => {
    const distancia = Math.abs(columna.rect.left + columna.rect.width / 2 - centroActual);
    if (distancia < mejorDistancia) {
      mejorDistancia = distancia;
      indice = i;
    }
  });

  // Se frena en los extremos en vez de dar la vuelta: envolver haría que una
  // flecha de más mande la orden de Cancelada a Pendiente sin quererlo.
  const destino = columnas[Math.min(columnas.length - 1, Math.max(0, indice + horizontal))];

  return {
    x: destino.rect.left + destino.rect.width / 2 - collisionRect.width / 2,
    y: destino.rect.top + 24,
  };
}

/**
 * Envuelve una estrategia de detección de colisión para que **ignore toda zona
 * sin área en pantalla**.
 *
 * ⚠️ Es lo que hace inofensivo el arrastre en celular, y de paso lo que apaga
 * los tabs en escritorio — **un solo mecanismo para las dos anchuras, sin una
 * sola rama por breakpoint ni `matchMedia`** (que sería el primer breakpoint en
 * JS del proyecto).
 *
 * El problema que resuelve: abajo de `lg` las cuatro columnas siguen MONTADAS
 * —hacen falta las cuatro respuestas para que los contadores de los tabs digan
 * la verdad— pero tres están en `display: none`, y dnd-kit las mide 0×0. Sin
 * este filtro, la detección de colisión puede resolver hacia una columna
 * invisible y disparar un cambio de estado que nadie eligió: sin error, sin
 * aviso, y con el pedido ya movido. Del otro lado pasa lo simétrico: los tabs
 * son `lg:hidden`, así que en escritorio miden 0×0 y quedan afuera por la misma
 * regla.
 *
 * Se envuelve una estrategia en vez de escribir una propia para no reimplementar
 * la geometría de dnd-kit: acá solo se decide QUIÉN participa.
 */
export function soloDroppablesVisibles(estrategia) {
  return (args) => {
    const visibles = args.droppableContainers.filter((contenedor) => {
      const rect = args.droppableRects.get(contenedor.id);
      return rect && rect.width > 0 && rect.height > 0;
    });

    if (visibles.length === 0) return [];
    return estrategia({ ...args, droppableContainers: visibles });
  };
}

/**
 * Mueve una orden a su columna destino **solo para la vista**, mientras el
 * diálogo de confirmación está abierto.
 *
 * El movimiento real ocurre recién cuando el PATCH responde (no hay movimiento
 * optimista, a propósito: soltar no confirma nada y "Cancelar" es de primera
 * clase). Pero sin esta previsualización, al soltar la tarjeta se la ve
 * **volver a su columna original detrás del modal**, que es exactamente el
 * gesto contrario al que la persona acaba de hacer.
 *
 * Es una función PURA y derivada: cancelar el diálogo pone `movimiento` en
 * `null` y todo vuelve solo, sin nada que deshacer a mano. Los contadores se
 * mueven junto con la tarjeta porque, si no, la columna mostraría una tarjeta
 * más de las que dice tener.
 *
 * @param {Record<string, {ordenes: Array, total: number}>} columnas
 * @param {{ordenId: number, origen: string, destino: string}|null} movimiento
 */
export function previsualizarMovimiento(columnas, movimiento) {
  if (!movimiento) return columnas;

  const { ordenId, origen, destino } = movimiento;
  const colOrigen = columnas[origen];
  const colDestino = columnas[destino];
  if (!colOrigen || !colDestino) return columnas;

  const enVuelo = colOrigen.ordenes.find((orden) => orden.id === ordenId);
  // Puede no estar: el PATCH ya volvió y movió la orden de verdad antes de que
  // el diálogo termine de desmontarse.
  if (!enVuelo) return columnas;

  return {
    ...columnas,
    [origen]: {
      ...colOrigen,
      ordenes: colOrigen.ordenes.filter((orden) => orden.id !== ordenId),
      total: Math.max(0, colOrigen.total - 1),
    },
    [destino]: {
      ...colDestino,
      ordenes: [...colDestino.ordenes, enVuelo].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
      total: colDestino.total + 1,
    },
  };
}
