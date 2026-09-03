import { useEffect, useState } from "react";
import { claseCelda, claseEncabezado } from "../clasesTabla.js";
import { formatPrecio } from "../../../utils/formato.js";

/**
 * Los productos de una promoción, cada uno con SU porcentaje.
 *
 * EL DESCUENTO ES POR PRODUCTO. La acción de "aplicar el mismo a todos" es una
 * comodidad del panel, no una restricción del modelo: después de usarla se
 * puede cambiar cualquiera de a uno, y eso es exactamente lo que pide el §9.
 *
 * **El precio resultante lo calcula el BACKEND** y viaja en `precioPromocional`.
 * Calcularlo acá sería un segundo precio compitiendo con el que la orden va a
 * cobrar — y el admin estaría decidiendo mirando un número que no es el que se
 * factura.
 *
 * Mientras hay cambios sin guardar, la columna del resultante muestra un guion
 * en vez del valor viejo: un número que ya no corresponde al porcentaje que se
 * ve al lado es peor que ningún número.
 */

const PORCENTAJE_MIN = 5;
const PORCENTAJE_MAX = 50;

const claseInput =
  "w-20 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-right text-on-surface focus:border-primary focus:outline-none";

export default function EditorPromocion({ promocion, guardando, onGuardarItems, onQuitar }) {
  const [porcentajes, setPorcentajes] = useState({});
  const [masivo, setMasivo] = useState("");

  // Al cambiar de promoción, los borradores de la anterior no pueden quedar.
  useEffect(() => {
    setPorcentajes({});
    setMasivo("");
  }, [promocion?.id]);

  const items = promocion?.items ?? [];
  const hayCambios = Object.keys(porcentajes).length > 0;

  function valorDe(item) {
    return porcentajes[item.productId] ?? String(item.porcentaje);
  }

  function cambiar(productId, valor) {
    setPorcentajes((actuales) => ({ ...actuales, [productId]: valor }));
  }

  function aplicarATodos() {
    const numero = Number(masivo);
    if (!Number.isInteger(numero)) return;
    setPorcentajes(Object.fromEntries(items.map((i) => [i.productId, String(numero)])));
  }

  function guardar() {
    onGuardarItems(
      items.map((item) => ({
        productId: item.productId,
        porcentaje: Number(valorDe(item)),
      })),
    );
    setPorcentajes({});
  }

  if (items.length === 0) {
    return (
      <p className="font-body-md text-body-md py-6 text-on-surface-variant">
        Esta promoción todavía no tiene productos. Elegilos de la tabla de abajo y usá “Agregar a
        la promoción”.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* La acción masiva: comodidad, no restricción. Después de aplicarla se
          puede cambiar cualquiera de a uno. */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg bg-surface-container-low p-4">
        <div>
          <label
            htmlFor="descuento-masivo"
            className="font-label-md text-label-md mb-2 block uppercase tracking-widest text-on-surface"
          >
            Mismo descuento a todos
          </label>
          <input
            id="descuento-masivo"
            type="number"
            min={PORCENTAJE_MIN}
            max={PORCENTAJE_MAX}
            value={masivo}
            onChange={(e) => setMasivo(e.target.value)}
            className={claseInput}
            placeholder="15"
          />
        </div>
        <button
          type="button"
          disabled={guardando || masivo === ""}
          onClick={aplicarATodos}
          className="font-label-md text-label-md rounded-lg border border-outline-variant px-4 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
        >
          Aplicar a los {items.length}
        </button>
        <p className="font-body-sm text-body-sm flex-1 text-on-surface-variant">
          Después podés cambiar cualquiera de a uno. Entre {PORCENTAJE_MIN} % y {PORCENTAJE_MAX} %.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant">
        <table role="table" className="w-full">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-outline-variant bg-surface-container-low text-left">
              <th role="columnheader" className={claseEncabezado}>Producto</th>
              <th role="columnheader" className={`${claseEncabezado} text-right`}>Precio</th>
              <th role="columnheader" className={`${claseEncabezado} text-right`}>Descuento</th>
              <th role="columnheader" className={`${claseEncabezado} text-right`}>Queda en</th>
              <th role="columnheader" className={`${claseEncabezado} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {items.map((item) => {
              const editado = porcentajes[item.productId] !== undefined;
              return (
                <tr
                  key={item.productId}
                  role="row"
                  className={`border-b border-outline-variant last:border-b-0 ${
                    item.habilitado ? "" : "opacity-60"
                  }`}
                >
                  <td role="cell" className={`${claseCelda} text-on-surface`}>
                    {item.nombre}
                    <span className="font-body-sm text-body-sm block text-on-surface-variant">
                      {item.sku}
                      {item.habilitado ? "" : " · apagado por un conflicto"}
                    </span>
                  </td>
                  <td role="cell" className={`${claseCelda} text-right text-on-surface-variant`}>
                    {formatPrecio(item.precio)}
                  </td>
                  <td role="cell" className={`${claseCelda} text-right`}>
                    <input
                      type="number"
                      min={PORCENTAJE_MIN}
                      max={PORCENTAJE_MAX}
                      value={valorDe(item)}
                      onChange={(e) => cambiar(item.productId, e.target.value)}
                      aria-label={`Descuento de ${item.nombre}`}
                      className={claseInput}
                    />
                  </td>
                  <td role="cell" className={`${claseCelda} text-right font-medium text-primary`}>
                    {/* Con un cambio sin guardar, el resultante viejo ya no
                        corresponde al porcentaje de al lado. Un guion es más
                        honesto que un número desactualizado. */}
                    {editado ? "—" : formatPrecio(item.precioPromocional)}
                  </td>
                  <td role="cell" className={`${claseCelda} text-right`}>
                    <button
                      type="button"
                      disabled={guardando}
                      onClick={() => onQuitar(item.productId)}
                      className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={guardando || !hayCambios}
          onClick={guardar}
          className="font-label-md text-label-md rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {guardando ? "Guardando…" : "Guardar descuentos"}
        </button>
      </div>
    </div>
  );
}
