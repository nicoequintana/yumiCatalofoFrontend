import { useState } from "react";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SoloEscritorio from "../../components/admin/SoloEscritorio.jsx";
import DialogoCampania from "../../components/admin/campanias/DialogoCampania.jsx";
import EditorCampaniaHeader from "../../components/admin/campanias/EditorCampaniaHeader.jsx";
import PromocionesDeCampania from "../../components/admin/campanias/PromocionesDeCampania.jsx";
import SeccionBanner from "../../components/admin/campanias/SeccionBanner.jsx";
import SeccionCampania from "../../components/admin/campanias/SeccionCampania.jsx";
import SeccionCartel from "../../components/admin/campanias/SeccionCartel.jsx";
import SeccionDestinoCta from "../../components/admin/campanias/SeccionDestinoCta.jsx";
import SelectorProductos from "../../components/admin/campanias/SelectorProductos.jsx";
import useCampaniaEditor from "../../hooks/useCampaniaEditor.js";

/**
 * Alta y edición de una campaña, como PÁGINA.
 *
 * Rutas:
 *   - `/catalogo/admin/campanias/nueva`        -> alta (acepta `?dia=AAAA-MM-DD`)
 *   - `/catalogo/admin/campanias/:id/editar`   -> edición
 *
 * POR QUÉ UNA PÁGINA Y NO EL DIÁLOGO QUE ERA. El editor ya medía 1.686 px de
 * alto en una ventana de 800, y eso ANTES de sumarle un selector de productos:
 * elegir la vitrina dentro de un modal es un flujo dentro de un flujo. El repo
 * ya tomó esta decisión con el editor de producto (`/productos/nuevo`,
 * `/productos/:id/editar` son páginas), y esto sigue ese precedente.
 *
 * SECCIONES APILADAS EN UNA COLUMNA, con el ancho acotado a 1080 px. Un input
 * de 1400 px es tan malo como un formulario de tres pantallas: la línea deja de
 * poder recorrerse de un vistazo.
 *
 * ⚠️ **Productos y Promociones van FUERA del `<form>`.** Guardan por endpoint
 * propio y en el acto; adentro, cualquier botón al que se le escape el
 * `type="button"` dispararía el submit del formulario entero. Se nombran por lo
 * que son y no por su número de orden: hasta el 06/09/2026 este comentario
 * decía "las secciones 3 y 4", que dejó de ser cierto al insertarse Banner.
 *
 * ⚠️ **Todas las secciones son HERMANAS, así que sus títulos son todos `<h2>`.**
 * El `<h1>` es el nombre de la campaña, en el encabezado. Productos y
 * Promociones llegaron a ser `<h3>`: para la vista da igual —todas usan la
 * misma clase—, pero un lector de pantalla las anunciaba como subsecciones del
 * Cartel, que es donde nada de eso vive. Hoy son SEIS: Campaña, Cartel, Banner,
 * Destino del CTA, Productos y Promociones.
 *
 * ⚠️ **Doodle, Productos y Promociones solo existen con id.** En `/nueva` no se
 * renderizan: el Doodle sube a `PUT /:id/doodle` y no se le puede subir una
 * imagen a algo que todavía no fue creado. Mismo patrón que `SolapaImagenes`
 * con los bloques de IA.
 *
 * Va envuelto en `SoloEscritorio` por el mismo motivo que el calendario: el item
 * no aparece en el drawer de < lg, pero la ruta sigue existiendo para un enlace
 * guardado o una URL pegada a mano.
 */
/**
 * El estado "todavía no" de una sección del alta.
 *
 * Es un cartel y no una sección escondida a propósito: el hueco cuenta que la
 * sección existe y qué falta para habilitarla, en vez de dejar la página con
 * forma de incompleta.
 */
/**
 * El motivo de un fallo, pintado DENTRO de la sección que lo produjo.
 *
 * Las secciones 3 y 4 arrancan después de un formulario de ~1.686 px: el error
 * general de la página se renderiza arriba de todo y no entra en el viewport de
 * quien apretó el botón. Un error invisible se lee como un botón que no hace
 * nada. Mismo criterio que el error del diálogo de borrado, que va adentro del
 * diálogo porque el velo tapa la página.
 */
function ErrorDeSeccion({ children }) {
  if (!children) return null;
  return (
    <p className="font-body-md text-body-md mb-5 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
      {children}
    </p>
  );
}

function AunNoDisponible({ children }) {
  return (
    <p className="font-body-md text-body-md flex items-start gap-2 rounded-lg border border-dashed border-outline-variant bg-surface-container-low px-4 py-3 text-on-surface-variant">
      <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
        lock
      </span>
      {children}
    </p>
  );
}

/** El selector de la vitrina, con las props que salen del detalle ya cargado. */
function SecccionProductos({ campania, guardando, onGuardar }) {
  return (
    <SelectorProductos
      productos={campania?.productos ?? []}
      promocionesAsociadas={campania?.promociones ?? []}
      guardando={guardando}
      onGuardar={onGuardar}
    />
  );
}

export default function AdminCampaniaEditor() {
  const {
    esEdicion,
    opciones,
    campania,
    promociones,
    valores,
    diasFaltantes,
    cargando,
    errorCarga,
    noEncontrada,
    guardando,
    error,
    eliminando,
    errorEliminar,
    errorProductos,
    errorPromociones,
    sucio,
    confirmarSalida,
    editar,
    editarDestinoCta,
    guardar,
    eliminar,
    duplicar,
    alternarEstado,
    cambiarDoodle,
    borrarDoodle,
    cambiarArte,
    borrarArte,
    guardarProductos,
    guardarPromociones,
  } = useCampaniaEditor();

  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);

  if (noEncontrada) {
    return (
      <SoloEscritorio titulo="Campañas">
        <EstadoVacio
          icono="search_off"
          titulo="Campaña no encontrada"
          mensaje="La campaña que intentás editar no existe o fue eliminada."
        />
      </SoloEscritorio>
    );
  }

  // Distinto de "no encontrada": la campaña puede existir perfectamente y lo que
  // falló es la conexión. Mostrar el formulario vacío haría creer que se quedó
  // sin datos, y guardarlo los borraría de verdad.
  if (errorCarga) {
    return (
      <SoloEscritorio titulo="Campañas">
        <EstadoVacio
          icono="cloud_off"
          titulo="No se pudo cargar la campaña"
          mensaje="Revisá tu conexión e intentá de nuevo."
        />
      </SoloEscritorio>
    );
  }

  if (cargando) {
    return (
      <SoloEscritorio titulo="Campañas">
        <div className="flex items-center justify-center gap-3 py-24">
          <Spinner className="h-8 w-8 text-on-surface-variant" />
          <span className="font-body-md text-body-md text-on-surface-variant">
            Cargando campaña…
          </span>
        </div>
      </SoloEscritorio>
    );
  }

  return (
    <SoloEscritorio titulo="Campañas">
      <div className="flex w-full flex-col">
        <EditorCampaniaHeader
          campania={campania}
          esEdicion={esEdicion}
          sucio={sucio}
          guardando={guardando}
          confirmarSalida={confirmarSalida}
          onEliminar={() => setConfirmandoBorrado(true)}
          onDuplicar={duplicar}
          onAlternarEstado={alternarEstado}
        />

        <main className="w-full px-4 py-8 md:px-8">
          {error ? (
            <p className="font-body-md text-body-md mb-6 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
              {error}
            </p>
          ) : null}

          <form id="form-campania" onSubmit={guardar} className="flex flex-col gap-6">
            {/* `className="contents"` es obligatorio: sin ella el `<fieldset>`
                rompe el layout flex de adentro. */}
            <fieldset disabled={guardando} className="contents">
              <SeccionCampania
                valores={valores}
                editar={editar}
                opciones={opciones}
                esEdicion={esEdicion}
                campania={campania}
                guardando={guardando}
                onSubirDoodle={cambiarDoodle}
                onQuitarDoodle={borrarDoodle}
              />

              <SeccionCartel
                valores={valores}
                editar={editar}
                opciones={opciones}
                campania={campania}
                diasFaltantes={diasFaltantes}
              />

              <SeccionBanner
                valores={valores}
                editar={editar}
                opciones={opciones}
                campania={campania}
                guardando={guardando}
                esEdicion={esEdicion}
                onSubirArte={cambiarArte}
                onQuitarArte={borrarArte}
              />

              <SeccionDestinoCta
                valores={valores}
                editar={editar}
                editarDestinoCta={editarDestinoCta}
                opciones={opciones}
                campania={campania}
                guardando={guardando}
              />
            </fieldset>
          </form>

          {/* ---------------- Fuera del formulario: guardan solas ---------------- */}
          {/* Las dos secciones se muestran SIEMPRE, y en el alta esperan.
              Esconderlas hacía que la pantalla pareciera incompleta: quien
              entra por primera vez no se entera de que la vitrina existe, y
              quien ya la conoce la busca y no la encuentra. Mostrarlas
              bloqueadas cuenta lo que viene y por qué todavía no se puede —
              las dos escriben en endpoints `/:id/...` y no hay id hasta que
              la campaña exista. */}
          <section
            aria-labelledby="titulo-seccion-productos"
            className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
          >
            <h2
              id="titulo-seccion-productos"
              className="font-headline-sm text-headline-sm mb-2 text-primary"
            >
              Productos de la campaña
            </h2>
            <p className="font-body-md text-body-md mb-5 text-on-surface-variant">
              La vitrina: qué muestra la campaña. Es otra pregunta que qué descuentos aplica — un
              producto puede estar acá sin ninguna rebaja.
            </p>
            <ErrorDeSeccion>{errorProductos}</ErrorDeSeccion>
            {esEdicion ? (
              <SecccionProductos
                campania={campania}
                guardando={guardando}
                onGuardar={guardarProductos}
              />
            ) : (
              <AunNoDisponible>Guardá la campaña para empezar a armar la vitrina.</AunNoDisponible>
            )}
          </section>

          <section
            aria-labelledby="titulo-seccion-promociones"
            className="mt-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
          >
            <h2
              id="titulo-seccion-promociones"
              className="font-headline-sm text-headline-sm mb-2 text-primary"
            >
              Promociones
            </h2>
            <p className="font-body-md text-body-md mb-5 text-on-surface-variant">
              Qué descuentos aplica mientras esté activa. Apagar la campaña los apaga a todos de
              una.
            </p>
            <ErrorDeSeccion>{errorPromociones}</ErrorDeSeccion>
            {esEdicion ? (
              <PromocionesDeCampania
                promociones={promociones}
                asociadas={campania?.promociones}
                guardando={guardando}
                onGuardar={guardarPromociones}
              />
            ) : (
              <AunNoDisponible>
                Guardá la campaña para elegir qué promociones aplica.
              </AunNoDisponible>
            )}
          </section>
        </main>

        {confirmandoBorrado ? (
          <DialogoCampania
            titulo="Eliminar campaña"
            onCerrar={() => {
              // No se deja cerrar con el pedido ya en vuelo: ahí el admin
              // quedaría sin saber si la campaña se borró o no.
              if (eliminando) return;
              setConfirmandoBorrado(false);
            }}
          >
            <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
              ¿Seguro que querés eliminar{" "}
              <strong className="text-on-surface">{campania?.nombre}</strong>? No se puede deshacer.
              Los productos y las promociones siguen existiendo: solo se pierde esta campaña.
            </p>

            {/* El motivo del fallo va ACÁ ADENTRO y no en la página: el velo del
                diálogo la tapa, y un error invisible se lee como un botón que no
                hace nada — el admin lo vuelve a apretar. */}
            {errorEliminar ? (
              <p className="font-body-md text-body-md mb-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
                {errorEliminar}
              </p>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setConfirmandoBorrado(false)}
                className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant transition-colors hover:border-outline disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={eliminando}
                onClick={eliminar}
                className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-error px-5 py-3 uppercase tracking-widest text-on-error transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {eliminando ? <Spinner className="h-4 w-4 text-on-error" decorativo /> : null}
                Sí, eliminar
              </button>
            </div>
          </DialogoCampania>
        ) : null}
      </div>
    </SoloEscritorio>
  );
}
