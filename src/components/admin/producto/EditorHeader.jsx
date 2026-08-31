import BotonVolver from "../../BotonVolver.jsx";
import Spinner from "../../Spinner.jsx";

/**
 * Barra superior del editor de producto: volver, título, badge de cambios sin
 * guardar y los dos botones de acción.
 *
 * El botón Guardar no vive dentro del `<form>`: lo alcanza por `form="form-producto"`,
 * porque el formulario y el header están en columnas distintas del layout.
 * `onGuardar` corre antes del submit nativo y puede cancelarlo (ver
 * `handleClickGuardar` en `AdminProductoForm`).
 *
 * **Eliminar solo aparece en edición**, y separado del par Cancelar/Guardar por
 * un margen propio. Dos motivos: un producto que todavía no existe no se puede
 * borrar, y una acción destructiva pegada a la acción principal se clickea sola
 * — el separador es lo que hace que el gesto tenga que ser deliberado.
 */
function EditorHeader({
  esEdicion,
  sucio,
  guardando,
  confirmarSalida,
  onCancelar,
  onGuardar,
  onEliminar,
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant bg-surface px-4 py-4 md:px-8 lg:static">
      <div className="min-w-0">
        <div className="mb-2">
          <BotonVolver fallback="/catalogo/admin/productos" puedeSalir={confirmarSalida} />
        </div>
        <span className="font-label-sm text-label-sm block uppercase tracking-[0.2em] text-secondary">
          Panel de administración
        </span>
        <h1 className="font-headline-md text-headline-md text-primary">
          {esEdicion ? "Editar producto" : "Agregar producto"}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {sucio ? (
          <span className="font-body-md text-body-md inline-flex items-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Cambios sin guardar
          </span>
        ) : null}
        {esEdicion ? (
          <button
            type="button"
            onClick={onEliminar}
            className="font-label-md text-label-md mr-3 inline-flex items-center justify-center gap-2 rounded-lg border border-error px-5 py-3 uppercase tracking-widest text-error hover:bg-error-container"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              delete
            </span>
            Eliminar producto
          </button>
        ) : null}
        <button
          type="button"
          onClick={onCancelar}
          className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-producto"
          onClick={onGuardar}
          disabled={guardando}
          className="font-label-md text-label-md inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
        >
          {guardando ? <Spinner className="h-4 w-4 text-on-primary" /> : null}
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </header>
  );
}

export default EditorHeader;
