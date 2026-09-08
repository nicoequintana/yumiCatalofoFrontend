import useDialogo from "../../../hooks/useDialogo.js";
import VeloModal from "../../VeloModal.jsx";
import { AREA_TACTIL_ICONO } from "../../../utils/areaTactil.js";

/**
 * La cáscara de los diálogos de Campañas.
 *
 * Vive aparte de `AdminCampanias` porque su valor está en el CONTENEDOR, no en
 * el contenido: es lo que resuelve los dos modos en que un modal alto se rompe
 * en este panel. Los dos aparecieron con el formulario de campaña, que es el
 * más alto que tiene el admin, y ninguno de los dos da error.
 *
 * ── 1. EL PANEL SE DESBORDA POR ARRIBA Y NO HAY CÓMO LLEGAR ──
 *
 * `my-auto` sobre un ítem flex dentro de un contenedor con scroll reparte
 * también el espacio NEGATIVO: si el panel es más alto que la ventana, la mitad
 * del sobrante se va hacia arriba del origen del scroll, y ahí no se puede
 * scrollear. El encabezado del diálogo quedaba fuera de la pantalla, sin barra
 * que lo alcanzara.
 *
 * El reemplazo es el envoltorio `min-h-full`: centra mientras el contenido
 * entra, y en cuanto no entra lo apoya arriba y deja que el velo scrollee.
 *
 * ── 2. LA BOTTOM NAV DE ESCRITORIO SE PINTA ENCIMA ──
 *
 * Es la trampa del contexto de apilamiento de `AdminLayout`, y la resuelve
 * **`VeloModal`** con un portal a `body`. Acá apareció primero, porque este
 * es el diálogo más alto del panel; el detalle completo está allá, y aplica a
 * los siete diálogos por igual.
 *
 * `lg:pb-24` es el remate: aun ganando el apilamiento, un panel que TERMINA
 * justo donde empieza la nav se lee como cortado. El padding lo despega.
 */
export default function DialogoCampania({ titulo, onCerrar, children }) {
  const dialogoRef = useDialogo({ onCerrar });

  return (
    <VeloModal className="z-50 overflow-y-auto bg-black/40 p-6 lg:pb-24">
      <div className="flex min-h-full items-center justify-center">
        <div
          ref={dialogoRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-dialogo-campania"
          tabIndex={-1}
          className="w-full max-w-2xl rounded-xl bg-surface-container-lowest p-6 shadow-ambient outline-none"
        >
          <div className="mb-6 flex items-start justify-between gap-3">
            <h2
              id="titulo-dialogo-campania"
              className="font-headline-sm text-headline-sm text-primary"
            >
              {titulo}
            </h2>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              // El glifo NO crece: 20px al lado del título es lo que equilibra
              // el encabezado. El área se extiende con el pseudo-elemento de
              // `utils/areaTactil.js`, seguro acá porque el único vecino es el
              // `<h2>` y un título no es un control: nadie le roba el área a
              // nadie. `p-1` sobre un glifo de 20px da ~28×28, la mitad del
              // mínimo de 44×44 (WCAG 2.5.8) — es la caja declarada, porque la
              // medición del 07/09/2026 barrió la pantalla en reposo y este
              // botón solo existe con el diálogo abierto.
              className={`${AREA_TACTIL_ICONO} rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container`}
            >
              <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
                close
              </span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </VeloModal>
  );
}
