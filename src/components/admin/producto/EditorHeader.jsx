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
 *
 * Los tres botones llevan `min-h-11` (44px) ADEMÁS de su `py-3`, no en lugar de
 * él: el mínimo táctil de WCAG 2.5.8 es un PISO y el padding sigue decidiendo
 * el aire alrededor del texto (mismo criterio que `SelectorCantidad.jsx`).
 * Medido en navegador el 07/09/2026 con `elementFromPoint` —área EFECTIVA, no
 * la caja declarada—: "Guardar" daba 93x42 sobre una caja de 119x41, porque
 * `text-label-md` son 14px con interlineado 1.2 (16,8) más 12+12 de padding =
 * 40,8. Los otros dos comparten esa caja exacta, así que se corrigen juntos:
 * arreglar solo el que salió en la auditoría dejaría a Cancelar en 41.
 *
 * El "Volver" de acá arriba NO necesita nada: ya declara `min-h-11` en
 * `BotonVolver.jsx`. Sus 89x36 de área efectiva no eran suyos — se los comía la
 * barra sticky del shell, ver el `<main>` de `AdminLayout.jsx`.
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
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant bg-surface px-4 py-4 md:px-8">
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

      <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
        {sucio ? (
          <span className="font-body-md text-body-md inline-flex basis-full items-center gap-2 text-on-surface-variant sm:basis-auto">
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            Cambios sin guardar
          </span>
        ) : null}
        {esEdicion ? (
          <button
            type="button"
            onClick={onEliminar}
            className="font-label-md text-label-md mr-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-error px-5 py-3 uppercase tracking-widest text-error hover:bg-error-container"
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
          className="font-label-md text-label-md inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline"
        >
          Cancelar
        </button>
        <button
          type="submit"
          form="form-producto"
          onClick={onGuardar}
          disabled={guardando}
          className="font-label-md text-label-md inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container disabled:opacity-60"
        >
          {guardando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
          {guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </header>
  );
}

export default EditorHeader;
