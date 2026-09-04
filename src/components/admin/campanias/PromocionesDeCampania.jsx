/**
 * Qué promociones aplica la campaña mientras está activa.
 *
 * De acá sale la regla más útil del módulo: apagar la campaña las apaga a todas
 * de una, sin tener que desactivar ninguna por separado.
 *
 * ⚠️ **Desasociar NO borra la promoción**: sigue existiendo con sus productos y
 * sus otras programaciones. Y son OTRA cosa que la vitrina — una campaña puede
 * exhibir productos sin descuento y descontar productos que no exhibe.
 *
 * Cada checkbox persiste en el acto contra su propio endpoint. Por eso esta
 * sección vive FUERA del `<form>` de la campaña: adentro, un control sin
 * `type="button"` dispararía el submit del formulario entero.
 */
export default function PromocionesDeCampania({ promociones, asociadas, guardando, onGuardar }) {
  const idsAsociadas = new Set((asociadas ?? []).map((p) => p.id));

  if (promociones.length === 0) {
    return (
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Todavía no hay promociones. Creá una desde <strong>Promociones</strong> y volvé acá para
        asociarla.
      </p>
    );
  }

  return (
    <div className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-outline-variant p-2">
      {promociones.map((promocion) => {
        const asociada = idsAsociadas.has(promocion.id);
        return (
          <label
            key={promocion.id}
            className="font-body-md text-body-md flex items-center gap-3 rounded px-2 py-2 text-on-surface transition-colors hover:bg-surface-container"
          >
            <input
              type="checkbox"
              checked={asociada}
              disabled={guardando}
              onChange={() => {
                const actuales = [...idsAsociadas];
                onGuardar(
                  asociada
                    ? actuales.filter((id) => id !== promocion.id)
                    : [...actuales, promocion.id],
                );
              }}
              className="h-4 w-4 accent-[rgb(var(--color-primary))]"
            />
            <span className="truncate">{promocion.nombre}</span>
            <span className="font-body-sm text-body-sm ml-auto shrink-0 text-on-surface-variant">
              {promocion.cantidadProductos} producto
              {promocion.cantidadProductos === 1 ? "" : "s"}
            </span>
          </label>
        );
      })}
    </div>
  );
}
