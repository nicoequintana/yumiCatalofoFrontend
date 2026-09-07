/**
 * El panel que muestra qué se pidió en una orden.
 *
 * Presentacional puro: no sabe de hover, ni de click-afuera, ni de cuál panel
 * está abierto. Quién lo abre y cuál es el único abierto lo decide la pantalla
 * que lo monta — hoy `AdminOrdenes.jsx`, en la fila expandible de su grilla.
 *
 * **Se posiciona al ancho de su contenedor, no siguiendo al puntero**, y eso es
 * lo que hace innecesaria una librería de floating: ocupando todo el ancho no
 * hay flip ni shift horizontal que calcular, solo un desborde vertical que
 * acota un `max-h`. El repo no tiene ninguna librería de popover y esta feature
 * no agrega una.
 *
 * **Embebido (el default) NO dibuja marco propio, y eso es el punto.** Con su
 * propio borde, su propio fondo y su propia sombra se leía como una tarjeta
 * flotando debajo de la fila —"la orden #4198 y abajo un cartel"— en vez de
 * como la continuación de esa orden. Sin marco, comparte la superficie de la
 * fila y el bloque entero se lee como un solo cuadrante desplegado. Quien lo
 * monta es el que abre y cierra el bloque, así que también es el que pone la
 * animación: acá no hay ninguna.
 *
 * ⚠️ `flotante` es la variante ANTIGUA (se superpone al contenido de abajo
 * anclada a un ancestro `relative`) y hoy la usa un solo consumidor, la tarjeta
 * del tablero Kanban que la grilla reemplazó. **El default está del lado del
 * camino vivo a propósito**: un default que solo sirve al código muerto es una
 * trampa para el próximo que monte este panel.
 *
 * ⚠️ Flotando, de acá sale una restricción sobre el contenedor: **no puede
 * llevar `overflow-y-auto`**. Un contenedor con scroll recortaría este panel.
 *
 * @param {object} props
 * @param {string} props.id - el `id` del panel, apuntado por el `aria-controls`
 *   del disparador.
 * @param {Array<{nombreProducto: string, cantidad: number}>} props.resumen
 * @param {number|null} props.cantidadItems - TODAS las líneas de la orden, que
 *   pueden ser más que las del resumen (el backend lo topea en 5).
 * @param {string} props.montoFormateado
 * @param {boolean} [props.flotante=false] - `true` solo cuando el panel tiene
 *   que superponerse al contenido de abajo en vez de ocupar su lugar en el
 *   flujo.
 */
export default function ResumenOrden({
  id,
  resumen,
  cantidadItems,
  montoFormateado,
  flotante = false,
}) {
  const lineas = resumen ?? [];
  // El backend topea el resumen pero `cantidadItems` cuenta todo. Sin esta
  // cuenta, una orden de nueve productos se leería como de cinco.
  const ocultos = Math.max(0, (cantidadItems ?? lineas.length) - lineas.length);

  return (
    <div
      id={id}
      className={`max-h-64 overflow-y-auto ${
        flotante
          ? "absolute inset-x-0 top-full z-20 mt-1 rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-ambient"
          : // Embebido: la sangría lo alinea con las celdas de su fila (`px-4`)
            // y es lo único que lo separa de ella.
            "px-4 pb-4"
      }`}
    >
      <p className="font-label-sm text-label-sm mb-2 uppercase tracking-widest text-on-surface-variant">
        Productos
      </p>

      {lineas.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {lineas.map((linea) => (
            <li
              key={`${linea.nombreProducto}-${linea.cantidad}`}
              className="font-body-md text-body-md flex items-start justify-between gap-3 text-on-surface"
            >
              <span className="min-w-0 break-words">{linea.nombreProducto}</span>
              <span className="shrink-0 text-on-surface-variant">x {linea.cantidad}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No se pudo cargar el detalle de esta orden.
        </p>
      )}

      {ocultos > 0 ? (
        <p className="font-body-md text-body-md mt-2 text-on-surface-variant">
          y {ocultos} producto{ocultos === 1 ? "" : "s"} más
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between border-t border-outline-variant pt-2">
        <span className="font-label-md text-label-md text-on-surface-variant">Total</span>
        <strong className="font-label-md text-label-md text-primary">{montoFormateado}</strong>
      </div>
    </div>
  );
}
