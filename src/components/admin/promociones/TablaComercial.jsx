import CeldaProducto from "../CeldaProducto.jsx";
import { claseCelda, claseEncabezado } from "../clasesTabla.js";
import { formatPrecio } from "../../../utils/formato.js";

/**
 * El listado comercial del §14: cada producto con lo que hace falta para
 * decidir si merece un descuento.
 *
 * Cruza tres fuentes que hasta ahora ningún endpoint juntaba —lo del producto,
 * sus ventas, y en qué promociones participa—, y todo llega resuelto del
 * backend: acá no se calcula nada.
 *
 * LA CONVERSIÓN es la respuesta al §18 ("muchas visualizaciones, pocas
 * ventas"). Se muestra como número y se puede ordenar por ella; no hace falta
 * nada más sofisticado.
 *
 * ⚠️ `null` en conversión significa **sin vistas**, y se muestra como guion, no
 * como 0 %. Cero diría "nadie de los que lo vieron compró" y nadie lo vio. Es
 * la misma distinción que el margen sin costo.
 */

/** Umbral para marcar un producto que se mira y no se vende. */
const CONVERSION_BAJA = 2;
const VISTAS_PARA_OPINAR = 20;

/**
 * ¿Vale la pena señalar este producto?
 *
 * Con pocas vistas cualquier conversión es ruido —una venta de más mueve el
 * número veinte puntos—, así que el aviso pide un mínimo de tráfico antes de
 * opinar. Es la lección que este proyecto ya aprendió con el roadmap de
 * métricas: ordenar por dificultad técnica sin mirar el volumen del dato
 * produce pantallas que entrenan a desconfiar.
 */
function mereceAtencion(fila) {
  return fila.vistas >= VISTAS_PARA_OPINAR && fila.conversion !== null && fila.conversion < CONVERSION_BAJA;
}

export default function TablaComercial({ filas, seleccionados, onAlternar, guardando }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
      <table role="table" className="w-full">
        <thead role="rowgroup">
          <tr role="row" className="border-b border-outline-variant bg-surface-container-low text-left">
            <th role="columnheader" className={claseEncabezado}>
              <span className="sr-only">Seleccionar</span>
            </th>
            <th role="columnheader" className={claseEncabezado}>Producto</th>
            <th role="columnheader" className={claseEncabezado}>Categoría</th>
            <th role="columnheader" className={`${claseEncabezado} text-right`}>Vistas</th>
            <th role="columnheader" className={`${claseEncabezado} text-right`}>Vendidos</th>
            <th role="columnheader" className={`${claseEncabezado} text-right`}>Conversión</th>
            <th role="columnheader" className={`${claseEncabezado} text-right`}>Costo</th>
            <th role="columnheader" className={`${claseEncabezado} text-right`}>Coef.</th>
            <th role="columnheader" className={`${claseEncabezado} text-right`}>Precio</th>
            <th role="columnheader" className={claseEncabezado}>Promociones</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {filas.map((fila) => (
            <tr
              key={fila.id}
              role="row"
              className="border-b border-outline-variant transition-colors last:border-b-0 hover:bg-surface-container"
            >
              <td role="cell" className={claseCelda}>
                {/* El área táctil la aporta el `<label>`, no el input.
                    Medido en navegador el 07/09/2026 con `elementFromPoint` a
                    1280×800, los veinte checkboxes daban 20×21 de área
                    efectiva, menos de la mitad del mínimo de 44×44 (WCAG
                    2.5.8). Un `<input type="checkbox">` es un elemento
                    reemplazado y **no acepta `::before`**, así que el
                    pseudo-elemento de `utils/areaTactil.js` no sirve acá: el
                    envoltorio se lleva los 44×44 y el cuadradito visible sigue
                    en 20, que es lo que mantiene la fila compacta. Clickear el
                    envoltorio alterna el control por la asociación implícita
                    del propio `<label>` — no hace falta `htmlFor`. No lleva
                    margen negativo que compense el alto: la fila ya la manda
                    `CeldaProducto` con su miniatura, así que esta celda nunca
                    fue la que decide cuánto mide el `<tr>`. */}
                <label className="inline-flex h-11 w-11 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(fila.id)}
                    disabled={guardando}
                    onChange={() => onAlternar(fila.id)}
                    aria-label={`Seleccionar ${fila.nombre}`}
                    className="h-5 w-5 accent-[rgb(var(--color-primary))]"
                  />
                </label>
              </td>
              <td role="cell" className={`${claseCelda} text-on-surface`}>
                <CeldaProducto
                  nombre={fila.nombre}
                  sku={fila.sku}
                  fotoPortada={fila.fotoPortada}
                  visibleEnCatalogo={fila.visibleEnCatalogo}
                />
              </td>
              <td role="cell" className={`${claseCelda} text-on-surface-variant`}>
                {fila.categoria?.nombre ?? "—"}
              </td>
              <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
                {fila.vistas}
              </td>
              <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
                {fila.unidadesVendidas}
              </td>
              <td role="cell" className={`${claseCelda} text-right`}>
                {/* `null` = sin vistas. Guion, nunca 0 %. */}
                {fila.conversion === null ? (
                  <span className="text-on-surface-variant">—</span>
                ) : (
                  <span
                    className={
                      mereceAtencion(fila)
                        ? "font-label-md text-label-md rounded-full bg-tertiary-container px-2 py-0.5 text-on-tertiary-container"
                        : "text-on-surface-variant"
                    }
                    title={
                      mereceAtencion(fila)
                        ? "Se mira bastante y se vende poco: candidato a un descuento."
                        : undefined
                    }
                  >
                    {fila.conversion.toFixed(1)}%
                  </span>
                )}
              </td>
              <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
                {fila.costo === null ? "—" : formatPrecio(fila.costo)}
              </td>
              <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
                {fila.coeficiente ?? "—"}
              </td>
              <td role="cell" className={`${claseCelda} text-right text-on-surface`}>
                {formatPrecio(fila.precio)}
              </td>
              <td role="cell" className={`${claseCelda} text-on-surface-variant`}>
                {fila.promociones.length === 0 ? (
                  "—"
                ) : (
                  <span className="flex flex-wrap gap-1">
                    {fila.promociones.map((p) => (
                      <span
                        key={p.id}
                        className="font-label-sm text-label-sm rounded-full bg-secondary-container px-2 py-0.5 text-on-secondary-container"
                      >
                        {p.nombre} {p.porcentaje}%
                      </span>
                    ))}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
