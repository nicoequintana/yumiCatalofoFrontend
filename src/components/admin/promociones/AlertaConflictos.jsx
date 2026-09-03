import { claseCelda, claseEncabezado } from "../clasesTabla.js";

/**
 * Los conflictos entre promociones: dónde dos se pisan el precio de un producto.
 *
 * NO RESUELVE SOLA, y eso es del pedido (§35): elegir automáticamente el mayor
 * descuento, o la última cargada, sería tomar por el admin una decisión de plata
 * que él reservó para sí. Lo que la pantalla hace es **poner todo lo que hace
 * falta para decidir en una fila**: el producto, las promociones que compiten,
 * sus porcentajes, y **cuál está predominando ahora mismo**.
 *
 * Ese último dato es el que más importa y el más fácil de omitir. Mientras nadie
 * resuelve, el catálogo aplica el descuento MENOR — y la alerta tiene que decir
 * la verdad de lo que se está mostrando, no lo que debería mostrarse.
 *
 * ⚠️ Resolver un conflicto **apaga la promoción perdedora SOLO para ese
 * producto**: sigue funcionando para todos los demás. Y **no se reactiva sola**
 * cuando la ganadora termina — volver atrás es una acción explícita. Los dos
 * avisos están en la pantalla porque son lo que sorprende.
 */
export default function AlertaConflictos({ conflictos, guardando, onResolver }) {
  if (conflictos.length === 0) return null;

  return (
    <section
      aria-labelledby="titulo-conflictos"
      className="mb-10 rounded-xl border border-tertiary bg-tertiary-container p-5"
    >
      <div className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className="material-symbols-outlined text-[24px] text-on-tertiary-container"
        >
          warning
        </span>
        <div>
          <h2
            id="titulo-conflictos"
            className="font-headline-sm text-headline-sm text-on-tertiary-container"
          >
            {conflictos.length} producto{conflictos.length === 1 ? "" : "s"} con más de un descuento
          </h2>
          <p className="font-body-md text-body-md mt-1 text-on-tertiary-container">
            Mientras no elijas, el catálogo aplica <strong>el descuento menor</strong>. Elegir cuál
            manda apaga a la otra <strong>solo para ese producto</strong>, y no se vuelve a prender
            sola cuando la ganadora termine.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface-container-lowest">
        <table role="table" className="w-full">
          <thead role="rowgroup">
            <tr role="row" className="border-b border-outline-variant text-left">
              <th role="columnheader" className={claseEncabezado}>Producto</th>
              <th role="columnheader" className={claseEncabezado}>Compiten</th>
              <th role="columnheader" className={claseEncabezado}>Elegir cuál manda</th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            {conflictos.map((conflicto) => (
              <tr
                key={conflicto.productId}
                role="row"
                className="border-b border-outline-variant last:border-b-0"
              >
                <td role="cell" className={`${claseCelda} text-on-surface`}>
                  {conflicto.nombreProducto}
                </td>
                <td role="cell" className={claseCelda}>
                  <span className="flex flex-wrap gap-2">
                    {conflicto.promociones.map((promocion) => {
                      const predomina = promocion.id === conflicto.predominaId;
                      return (
                        <span
                          key={promocion.id}
                          className={`font-label-sm text-label-sm rounded-full px-3 py-1 ${
                            predomina
                              ? "bg-primary text-on-primary"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                          title={predomina ? "Es el que se está aplicando ahora." : undefined}
                        >
                          {promocion.nombre} · {promocion.porcentaje}%
                          {predomina ? " · se aplica" : ""}
                        </span>
                      );
                    })}
                  </span>
                </td>
                <td role="cell" className={claseCelda}>
                  <span className="flex flex-wrap gap-2">
                    {conflicto.promociones.map((promocion) => (
                      <button
                        key={promocion.id}
                        type="button"
                        disabled={guardando}
                        onClick={() => onResolver(conflicto, promocion.id)}
                        className="font-label-sm text-label-sm rounded-lg border border-outline-variant px-3 py-2 uppercase tracking-widest text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-60"
                      >
                        Que mande {promocion.nombre}
                      </button>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
