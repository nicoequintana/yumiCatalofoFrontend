import { claseTablaApilada } from "./clasesTabla.js";

/**
 * Tabla de errores de fila (Fila/Columna/Valor/Problema) que devuelven los
 * dos flujos masivos por planilla: alta (`AdminImportarProductos`) y
 * actualización (`AdminActualizarProductos`). Presentacional puro — no sabe
 * nada de fetch ni de qué flujo la está usando, solo pinta `errores`.
 *
 * Devuelve `null` si no hay errores, así el caller puede montarla siempre
 * sin envolverla en un condicional propio.
 *
 * En mobile la columna "Problema" es la que crece primero (`data-celda`
 * `identidad`): es el texto que importa leer de entrada, y Fila/Columna/Valor
 * pasan a ser el detalle rótulo/valor debajo.
 */
function TablaErroresImportacion({ errores }) {
  if (!errores || errores.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table role="table" className={`${claseTablaApilada} w-full text-left`}>
        <thead role="rowgroup" className="bg-surface-container">
          <tr role="row">
            <th
              role="columnheader"
              className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface"
            >
              Fila
            </th>
            <th
              role="columnheader"
              className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface"
            >
              Columna
            </th>
            <th
              role="columnheader"
              className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface"
            >
              Valor
            </th>
            <th
              role="columnheader"
              className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface"
            >
              Problema
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {errores.map((e, indice) => (
            <tr
              key={`${e.fila}-${e.columna}-${indice}`}
              role="row"
              className="border-t border-outline-variant"
            >
              <td
                role="cell"
                data-label="Fila"
                className="font-body-md text-body-md px-4 py-3 text-on-surface"
              >
                {e.fila}
              </td>
              <td
                role="cell"
                data-label="Columna"
                className="font-body-md text-body-md px-4 py-3 text-on-surface"
              >
                {e.columna}
              </td>
              <td
                role="cell"
                data-label="Valor"
                className="font-body-md text-body-md px-4 py-3 text-on-surface-variant"
              >
                {String(e.valor ?? "")}
              </td>
              <td
                role="cell"
                data-celda="identidad"
                className="font-body-md text-body-md px-4 py-3 text-on-surface-variant"
              >
                {e.motivo}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TablaErroresImportacion;
