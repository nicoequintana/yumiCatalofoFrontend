import FichaProducto from "../../FichaProducto.jsx";

/**
 * Columna derecha del editor: la vista previa de la ficha pública, con sus
 * controles propios (plantilla completa vs. vista real, ancho escritorio vs.
 * móvil).
 *
 * La ficha es el MISMO `FichaProducto` que renderiza `/producto/:id`, no una
 * copia: el preview no puede divergir del público porque *es* el público.
 *
 * `compacto` va siempre fijo: el panel del preview es media pantalla, más
 * angosto que el `lg` que asumen los breakpoints de viewport de la ficha, y
 * esos breakpoints miden el viewport, no el contenedor.
 *
 * El layout de dos columnas con scroll propio (`lg:overflow-y-auto`) en `lg`
 * se conserva porque son dos scrolls independientes lado a lado: la columna
 * de formulario/imágenes por un lado y este preview por otro, cada uno con su
 * propia barra de scroll. Por debajo de `lg` el preview es una pestaña más en
 * flujo normal (la alterna `EditorTabs`, la única pieza sticky del editor),
 * así que acá no hace falta ningún `position: sticky`.
 */
function PanelPreview({
  producto,
  visible,
  plantillaCompleta,
  onAlternarPlantilla,
  anchoPreview,
  onCambiarAncho,
}) {
  return (
    <div
      className={`border-outline-variant bg-surface-container-low lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:border-l ${
        visible ? "" : "hidden"
      }`}
    >
      <div className="flex flex-col lg:min-h-0 lg:flex-1">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3 lg:static">
          <span className="font-label-sm text-label-sm inline-flex items-center gap-2 uppercase tracking-widest text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              {plantillaCompleta ? "dashboard_customize" : "visibility"}
            </span>
            {plantillaCompleta ? "Plantilla completa" : "Así lo ve el cliente"}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAlternarPlantilla}
              className="font-label-sm text-label-sm inline-flex items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 uppercase tracking-widest text-on-surface-variant hover:border-outline"
            >
              <span className="material-symbols-outlined text-[16px]">
                {plantillaCompleta ? "visibility" : "dashboard_customize"}
              </span>
              {plantillaCompleta ? "Ver como cliente" : "Ver plantilla"}
            </button>

            {/* Solo desde `lg`: por debajo, el preview ya ocupa todo el ancho
                de su pestaña — no hay "ancho escritorio vs. móvil" que
                elegir, así que el toggle no tiene sentido y sobra. */}
            <div className="hidden gap-1 rounded-lg bg-surface-container-highest p-1 lg:flex">
              <button
                type="button"
                aria-label="Vista escritorio"
                aria-pressed={anchoPreview === "desktop"}
                onClick={() => onCambiarAncho("desktop")}
                className={`flex items-center rounded-md px-2 py-1 ${
                  anchoPreview === "desktop"
                    ? "bg-surface-container-lowest text-primary"
                    : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">desktop_windows</span>
              </button>
              <button
                type="button"
                aria-label="Vista móvil"
                aria-pressed={anchoPreview === "mobile"}
                onClick={() => onCambiarAncho("mobile")}
                className={`flex items-center rounded-md px-2 py-1 ${
                  anchoPreview === "mobile"
                    ? "bg-surface-container-lowest text-primary"
                    : "text-on-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">smartphone</span>
              </button>
            </div>
          </div>
        </div>

        {plantillaCompleta ? (
          <p className="font-body-md border-b border-outline-variant px-4 py-2 text-[13px] leading-snug text-on-surface-variant">
            Los bloques punteados están vacíos y no se publican.
          </p>
        ) : null}

        {/* `items-start` para que la ficha no se estire al alto del panel:
            debe medir lo que mide su contenido y scrollear dentro. */}
        <div className="flex items-start justify-center p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <div
            data-testid="preview-ficha"
            className={`w-full rounded-xl border border-outline-variant bg-background p-5 shadow-ambient ${
              anchoPreview === "mobile" ? "max-w-[390px]" : ""
            }`}
          >
            {/* Siempre compacto: el panel del preview es media pantalla,
                más angosto que el `lg` que asumen los breakpoints de
                viewport de la ficha. */}
            <FichaProducto
              producto={producto}
              modoPreview
              compacto
              plantillaCompleta={plantillaCompleta}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanelPreview;
