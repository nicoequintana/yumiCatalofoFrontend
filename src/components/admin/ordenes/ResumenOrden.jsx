/**
 * El panel que muestra qué se pidió en una orden, sin salir del tablero.
 *
 * Presentacional puro: no sabe de hover, ni de click-afuera, ni de cuál panel
 * está abierto. Eso lo maneja `TarjetaOrden` (la interacción) y
 * `TableroOrdenes` (cuál es el único abierto).
 *
 * **Se posiciona al ancho de la tarjeta, no siguiendo al puntero**, y eso es lo
 * que hace innecesaria una librería de floating: ocupando todo el ancho no hay
 * flip ni shift horizontal que calcular, solo un desborde vertical que acota un
 * `max-h`. El repo no tiene ninguna librería de popover y esta feature no
 * agrega una.
 *
 * ⚠️ De acá sale una restricción sobre las columnas: **no pueden llevar
 * `overflow-y-auto`**. Un contenedor con scroll recortaría este panel, y de
 * paso le daría a dnd-kit un scroll container extra que administrar durante el
 * arrastre.
 *
 * @param {object} props
 * @param {string} props.id - el `id` del panel, apuntado por el `aria-controls`
 *   del disparador.
 * @param {Array<{nombreProducto: string, cantidad: number}>} props.resumen
 * @param {number|null} props.cantidadItems - TODAS las líneas de la orden, que
 *   pueden ser más que las del resumen (el backend lo topea en 5).
 * @param {string} props.montoFormateado
 */
export default function ResumenOrden({ id, resumen, cantidadItems, montoFormateado }) {
  const lineas = resumen ?? [];
  // El backend topea el resumen pero `cantidadItems` cuenta todo. Sin esta
  // cuenta, una orden de nueve productos se leería como de cinco.
  const ocultos = Math.max(0, (cantidadItems ?? lineas.length) - lineas.length);

  return (
    <div
      id={id}
      className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest p-3 shadow-ambient"
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
