/**
 * Tabla de errores de fila (Fila/Columna/Valor/Problema) que devuelven los
 * dos flujos masivos por planilla: alta (`AdminImportarProductos`) y
 * actualización (`AdminActualizarProductos`). Presentacional puro — no sabe
 * nada de fetch ni de qué flujo la está usando, solo pinta `errores`.
 *
 * Devuelve `null` si no hay errores, así el caller puede montarla siempre
 * sin envolverla en un condicional propio.
 */
function TablaErroresImportacion({ errores }) {
  if (!errores || errores.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
      <table className="w-full text-left">
        <thead className="bg-surface-container">
          <tr>
            <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
              Fila
            </th>
            <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
              Columna
            </th>
            <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
              Valor
            </th>
            <th className="font-label-md text-label-md px-4 py-3 uppercase tracking-widest text-on-surface">
              Problema
            </th>
          </tr>
        </thead>
        <tbody>
          {errores.map((e, indice) => (
            <tr key={`${e.fila}-${e.columna}-${indice}`} className="border-t border-outline-variant">
              <td className="font-body-md text-body-md px-4 py-3 text-on-surface">{e.fila}</td>
              <td className="font-body-md text-body-md px-4 py-3 text-on-surface">{e.columna}</td>
              <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">
                {String(e.valor ?? "")}
              </td>
              <td className="font-body-md text-body-md px-4 py-3 text-on-surface-variant">{e.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TablaErroresImportacion;
