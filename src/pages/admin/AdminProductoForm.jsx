import { useRef, useState } from "react";
import EstadoVacio from "../../components/EstadoVacio.jsx";
import Spinner from "../../components/Spinner.jsx";
import SeccionesFormulario from "../../components/admin/producto/SeccionesFormulario.jsx";
import EditorHeader from "../../components/admin/producto/EditorHeader.jsx";
import EditorTabs from "../../components/admin/producto/EditorTabs.jsx";
import PanelPreview from "../../components/admin/producto/PanelPreview.jsx";
import SolapaImagenes from "../../components/admin/producto/SolapaImagenes.jsx";
import useProductoForm from "../../hooks/useProductoForm.js";
import useDialogo from "../../hooks/useDialogo.js";

/**
 * Shared create/edit editor.
 *
 * Routes:
 *   - `/catalogo/admin/productos/nuevo`        -> create mode (no `:id` param)
 *   - `/catalogo/admin/productos/:id/editar`   -> edit mode (prefills via getProductById)
 *
 * Two-pane layout: the form on the left, a live preview of the public product
 * sheet on the right, rendered by the very same `FichaProducto` the public
 * `/producto/:id` page uses. "Live" means live in local React state only —
 * nothing is persisted until submit, which still sends one `createProduct` /
 * `updateProduct` call exactly as before. Below `lg` the two panes become
 * Editar / Vista previa tabs, since they can't sit side by side.
 *
 * Esta pantalla solo compone y decide qué panel se ve. El estado, la carga y
 * el guardado viven en `useProductoForm`; cada pieza visual, en
 * `components/admin/producto/` (`EditorHeader`, `EditorTabs`,
 * `SeccionesFormulario`, `PanelPreview`).
 *
 * MediaUploader caps fotos/video in its own UI, but this form is the final
 * guard before the API — `createProduct`/`updateProduct` re-validate max 10
 * fotos / max 1 video server-side, so a thrown `Error` here always means real
 * invalid state, not a UI bug users could otherwise bypass.
 */
function AdminProductoForm() {
  const {
    esEdicion,
    cargando,
    noEncontrado,
    errorCarga,
    guardando,
    error,
    errorCategorias,
    sucio,
    valores,
    categorias,
    productoPreview,
    borradores,
    editar,
    precio,
    agregarCaracteristica,
    eliminarCaracteristica,
    agregarEspecificacion,
    eliminarEspecificacion,
    handleChangeFotos,
    handleSubmit,
    confirmarSalida,
    salirDelEditor,
    refrescarFotos,
    eliminando,
    errorEliminar,
    eliminarProducto,
  } = useProductoForm();

  // El borrado individual vive acá desde que se eliminó la columna "Acciones"
  // del listado. Es destructivo e irreversible, así que su diálogo atrapa el
  // foco y cierra con Escape (`useDialogo`), pero NO se deja cerrar mientras el
  // pedido ya salió: cerrarlo ahí dejaría al admin sin saber si el producto se
  // borró o no.
  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const dialogoBorradoRef = useDialogo({
    abierto: confirmandoBorrado,
    onCerrar: () => {
      if (eliminando) return;
      setConfirmandoBorrado(false);
    },
  });

  // Estado puramente visual: qué panel se ve, con qué ancho y en qué modo. No
  // es parte del producto, así que no entra al hook.
  const [panelActivo, setPanelActivo] = useState("form");
  const [anchoPreview, setAnchoPreview] = useState("desktop");
  // Arranca en plantilla: mientras se carga, la pregunta es "¿qué me falta?".
  // La vista real responde otra pregunta —"¿cómo queda?"— y sirve justo antes
  // de guardar, así que se elige a mano.
  const [plantillaCompleta, setPlantillaCompleta] = useState(true);
  const formRef = useRef(null);

  /**
   * En pantallas chicas las dos columnas son pestañas y la del formulario se
   * oculta con `display:none`. La validación nativa no puede enfocar un campo
   * requerido invisible, así que el navegador cancela el submit sin mensaje
   * alguno — apretabas Guardar y no pasaba nada. Acá se vuelve a la pestaña
   * Editar y recién entonces se pide el submit, ya con el campo visible.
   */
  function handleClickGuardar(event) {
    if (panelActivo === "form") return;

    event.preventDefault();
    setPanelActivo("form");
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  if (cargando) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
        <Spinner className="h-8 w-8 text-on-surface-variant" />
        <p className="font-body-md text-body-md text-on-surface-variant">Cargando producto…</p>
      </div>
    );
  }

  // Distinto de `noEncontrado`: el producto puede existir perfectamente, lo que
  // falló es la conexión. Mostrar el form vacío haría creer que el producto se
  // quedó sin datos, y guardarlo los borraría de verdad.
  if (esEdicion && errorCarga) {
    return (
      <div className="flex w-full flex-col items-center justify-center gap-4 px-margin-mobile py-24 text-center md:px-margin-desktop">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant">cloud_off</span>
        <p className="font-headline-md text-headline-md text-on-surface">No se pudo cargar el producto</p>
        <p className="font-body-md text-body-md max-w-md text-on-surface-variant">{errorCarga}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 uppercase tracking-widest text-on-primary hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[18px]">refresh</span>
          Reintentar
        </button>
      </div>
    );
  }

  if (noEncontrado) {
    return (
      <EstadoVacio
        icono="search_off"
        titulo="Producto no encontrado"
        mensaje="El producto que intentás editar no existe o fue eliminado."
      />
    );
  }

  return (
    // En `lg` el editor ocupa el alto del viewport (menos la bottom nav, el
    // `md:pb-20` de AdminLayout) y cada columna scrollea sola. No se puede usar
    // `position: sticky` acá: el `<main>` del layout lleva `overflow-x-auto`
    // por las tablas anchas del admin, lo que lo convierte en el scrollport del
    // sticky — pero quien scrollea es la ventana, así que el sticky nunca se
    // activaba y el preview se perdía de vista al bajar por el formulario.
    <div className="flex w-full flex-col lg:h-[calc(100vh-5rem)] lg:overflow-hidden">
      <EditorHeader
        esEdicion={esEdicion}
        sucio={sucio}
        guardando={guardando}
        confirmarSalida={confirmarSalida}
        onCancelar={salirDelEditor}
        onGuardar={handleClickGuardar}
        onEliminar={() => setConfirmandoBorrado(true)}
      />

      <EditorTabs panelActivo={panelActivo} onCambiarPanel={setPanelActivo} />

      <div className="grid grid-cols-1 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
        {/* ---------------- Columna izquierda: formulario / imágenes ----------------
            Comparten esta columna: en CUALQUIER tamaño se ve solo la que
            corresponde según `panelActivo` (ver el comentario en
            `EditorTabs.jsx`). El scroll ahora es de este envoltorio, no de
            cada hijo por separado — antes cada uno scrolleaba por su cuenta
            porque solo uno de los dos existía acá. */}
        <div className="lg:min-h-0 lg:overflow-y-auto">
          <SeccionesFormulario
            visible={panelActivo === "form"}
            formRef={formRef}
            onSubmit={handleSubmit}
            guardando={guardando}
            valores={valores}
            editar={editar}
            precio={precio}
            categorias={categorias}
            errorCategorias={errorCategorias}
            error={error}
            esEdicion={esEdicion}
            borradores={borradores}
            agregarCaracteristica={agregarCaracteristica}
            eliminarCaracteristica={eliminarCaracteristica}
            agregarEspecificacion={agregarEspecificacion}
            eliminarEspecificacion={eliminarEspecificacion}
          />

          <SolapaImagenes
            visible={panelActivo === "imagenes"}
            productoId={valores.id}
            valores={valores}
            onChangeFotos={handleChangeFotos}
            onChangeVideo={editar("video")}
            onAdoptadas={refrescarFotos}
          />
        </div>

        {/* ---------------- Columna derecha: vista previa ---------------- */}
        <PanelPreview
          producto={productoPreview}
          visible={panelActivo === "preview"}
          plantillaCompleta={plantillaCompleta}
          onAlternarPlantilla={() => setPlantillaCompleta((valor) => !valor)}
          anchoPreview={anchoPreview}
          onCambiarAncho={setAnchoPreview}
        />
      </div>

      {confirmandoBorrado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-margin-mobile">
          <div
            ref={dialogoBorradoRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar-producto"
            tabIndex={-1}
            className="w-full max-w-sm rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
          >
            <h2
              id="titulo-eliminar-producto"
              className="font-headline-md text-headline-md mb-2 text-on-background"
            >
              Eliminar producto
            </h2>
            <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
              ¿Seguro que querés eliminar{" "}
              <strong className="text-on-surface">{valores.nombre}</strong>? Esta acción no se
              puede deshacer. Si tiene ventas, las órdenes conservan su detalle pero dejan de estar
              ligadas al producto.
            </p>
            {errorEliminar ? (
              <p className="font-body-md text-body-md mb-4 rounded-lg bg-error-container px-4 py-3 text-on-error-container">
                {errorEliminar}
              </p>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoBorrado(false)}
                disabled={eliminando}
                className="font-label-md text-label-md rounded-lg border border-outline-variant px-5 py-3 uppercase tracking-widest text-on-surface-variant hover:border-outline disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={eliminarProducto}
                disabled={eliminando}
                className="font-label-md text-label-md inline-flex items-center gap-2 rounded-lg bg-error px-5 py-3 uppercase tracking-widest text-on-error disabled:opacity-60"
              >
                {eliminando ? <Spinner className="h-4 w-4 text-on-error" /> : null}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminProductoForm;
