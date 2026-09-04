import BotonVolver from "../../BotonVolver.jsx";
import Spinner from "../../Spinner.jsx";
import { estiloDeCampania } from "../../../constants/campanias.js";

/**
 * La barra superior del editor de campaña. Molde: `producto/EditorHeader.jsx`.
 *
 * VA PEGADA (`sticky`) porque el editor es largo: las acciones tienen que estar
 * a mano desde cualquier sección, y bajar a buscar "Guardar" al final de la
 * cuarta es exactamente la fricción que este rediseño vino a sacar.
 *
 * **Guardar vive FUERA del `<form>`** y lo alcanza por `form="form-campania"`:
 * el formulario está más abajo en el layout, y el botón no puede estar dentro
 * de un contenedor que scrollea aparte. Precedente exacto: `EditorHeader` +
 * `SeccionesFormulario`.
 *
 * Los chips dicen ícono + texto, nunca color solo: una barra que solo cambia de
 * tono deja afuera a quien no distingue esos tonos, y se vuelve ilegible en una
 * captura en blanco y negro.
 */
export default function EditorCampaniaHeader({
  campania,
  esEdicion,
  sucio,
  guardando,
  confirmarSalida,
  onEliminar,
  onDuplicar,
  onAlternarEstado,
}) {
  const estilo = estiloDeCampania(campania);
  const encendida = campania?.estado === "HABILITADA";
  const enLaVitrina = campania?.productos?.length ?? 0;

  return (
    <header className="sticky top-0 z-10 border-b border-outline-variant bg-surface px-4 py-4 md:px-8">
      <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2">
            <BotonVolver fallback="/catalogo/admin/campanias" puedeSalir={confirmarSalida} />
          </div>
          <span className="font-label-sm text-label-sm block uppercase tracking-[0.2em] text-secondary">
            Panel de administración
          </span>
          <h1 className="font-headline-md text-headline-md truncate text-primary">
            {campania?.nombre ?? "Nueva campaña"}
          </h1>

          {esEdicion ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`font-label-sm text-label-sm inline-flex items-center gap-1 rounded-full px-3 py-1 ${estilo.barra}`}
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  {estilo.icono}
                </span>
                <span>
                  {campania?.etiquetaEstado} · {campania?.etiquetaTemporal}
                </span>
              </span>
              <span className="font-label-sm text-label-sm inline-flex items-center gap-1 rounded-full bg-surface-container px-3 py-1 text-on-surface-variant">
                <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                  storefront
                </span>
                <span>{enLaVitrina} en la vitrina</span>
              </span>
            </div>
          ) : null}
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {sucio ? (
            <span className="font-body-md text-body-md inline-flex basis-full items-center gap-2 text-on-surface-variant sm:basis-auto">
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                edit_note
              </span>
              Cambios sin guardar
            </span>
          ) : null}

          {/* Las tres acciones sobre la campaña YA EXISTENTE. En un alta no
              tienen sentido: no se puede borrar, duplicar ni apagar algo que
              todavía no fue creado. */}
          {esEdicion ? (
            <>
              <button
                type="button"
                disabled={guardando}
                onClick={onEliminar}
                className="font-label-md text-label-md mr-3 inline-flex items-center gap-2 rounded-lg border border-error px-5 py-3 uppercase tracking-widest text-error transition-colors hover:bg-error-container disabled:opacity-60"
              >
                <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                  delete
                </span>
                Eliminar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={onDuplicar}
                className={claseAccion}
              >
                Duplicar
              </button>
              <button
                type="button"
                disabled={guardando}
                onClick={onAlternarEstado}
                className={claseAccion}
              >
                {encendida ? "Apagar" : "Encender"}
              </button>
            </>
          ) : null}

          <button
            type="submit"
            form="form-campania"
            disabled={guardando}
            className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary transition-colors hover:bg-primary-container disabled:opacity-60"
          >
            {guardando ? <Spinner className="h-4 w-4 text-on-primary" decorativo /> : null}
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </header>
  );
}

const claseAccion =
  "font-label-md text-label-md inline-flex items-center gap-2 rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:border-outline disabled:opacity-60";
