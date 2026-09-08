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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant bg-surface-container-low px-4 py-3">
          <span className="font-label-sm text-label-sm inline-flex items-center gap-2 uppercase tracking-widest text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              {plantillaCompleta ? "dashboard_customize" : "visibility"}
            </span>
            {plantillaCompleta ? "Plantilla completa" : "Así lo ve el cliente"}
          </span>

          <div className="flex items-center gap-2">
            {/* `min-h-11` (44px) ADEMÁS del `py-1.5`, no en lugar de él: el
                mínimo táctil de WCAG 2.5.8 es un PISO y el padding sigue
                decidiendo el aire alrededor del texto (mismo criterio que
                `SelectorCantidad.jsx`). Medido en navegador el 07/09/2026 a
                1280px con `elementFromPoint` —área EFECTIVA, no la caja
                declarada—: 93x31 sobre una caja de 184x30, porque
                `text-label-sm` son 12px con interlineado 1.2 (14,4) más 6+6
                de padding = 26,4. */}
            <button
              type="button"
              onClick={onAlternarPlantilla}
              className="font-label-sm text-label-sm inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-outline-variant px-3 py-1.5 uppercase tracking-widest text-on-surface-variant hover:border-outline"
            >
              <span className="material-symbols-outlined text-[16px]">
                {plantillaCompleta ? "visibility" : "dashboard_customize"}
              </span>
              {plantillaCompleta ? "Ver como cliente" : "Ver plantilla"}
            </button>

            {/* Solo desde `lg`: por debajo, el preview ya ocupa todo el ancho
                de su pestaña — no hay "ancho escritorio vs. móvil" que
                elegir, así que el toggle no tiene sentido y sobra.

                `size-11` (44x44) y no el pseudo-elemento de
                `utils/areaTactil.js`: es un conmutador segmentado con los dos
                botones PEGADOS dentro del mismo riel. Dos pseudo-elementos de
                44 centrados a 38px de paso se superponen, y el segundo —que se
                pinta después— le roba al primero la mitad de su área, así que
                la incantación que sirve para un ícono suelto acá EMPEORA la
                medición en vez de arreglarla. La única salida es agrandar la
                caja real. Medido en navegador el 07/09/2026 a 1280px con
                `elementFromPoint`: 34x27 de área efectiva sobre 34x26 de caja
                (18px de ícono más 4+4 de `py-1`).

                El paso resultante es 48px de centro a centro (44 de caja + el
                `gap-1` del riel), por encima de los 44 exigidos; sin el gap
                quedaría en 44 justo, que cumple pero sin margen. El riel pasa
                de ~76 a ~100px de ancho, y entra: la fila del encabezado es
                `flex-wrap`. */}
            <div className="hidden gap-1 rounded-lg bg-surface-container-highest p-1 lg:flex">
              <button
                type="button"
                aria-label="Vista escritorio"
                aria-pressed={anchoPreview === "desktop"}
                onClick={() => onCambiarAncho("desktop")}
                className={`flex size-11 items-center justify-center rounded-md ${
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
                className={`flex size-11 items-center justify-center rounded-md ${
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
