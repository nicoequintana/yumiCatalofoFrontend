import { createPortal } from "react-dom";
import useDialogo from "../../../hooks/useDialogo.js";

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
 * `AdminLayout` mete barra y contenido en un `relative z-10` —y eso es
 * deliberado, resuelve que el header móvil no tape los modales—, pero deja la
 * navegación FUERA, para que sus tres capas se comparen contra la raíz. La
 * consecuencia es que un diálogo renderizado dentro del outlet, por más `z-50`
 * que declare, tiene capa efectiva 10: la bottom nav (`z-40`, en la raíz) le
 * gana siempre. Con un diálogo corto no se notaba; con el formulario de
 * campaña, los botones de guardar y cancelar quedaban abajo, tapados y sin
 * poder clickearse.
 *
 * **Por eso este diálogo va por portal a `document.body`.** Es lo único que lo
 * saca de ese contexto y lo pone a competir de igual a igual con la nav, donde
 * 50 > 40. No alcanza con subirle el z-index: adentro de un contexto de
 * apilamiento, el número no se compara con nada de afuera.
 *
 * `lg:pb-24` es el remate: aun ganando el apilamiento, un panel que TERMINA
 * justo donde empieza la nav se lee como cortado. El padding lo despega.
 *
 * ⚠️ Los otros diálogos del panel —borrado masivo de `AdminProductos`, borrado
 * del editor, confirmación de `AdminPrecios`, `DialogoNotificarEstado`— siguen
 * renderizándose dentro del outlet y comparten el problema 2. Hoy no se nota
 * porque son cortos y su contenido no llega a la franja de la nav, pero es el
 * mismo bug esperando un modal más alto.
 */
export default function DialogoCampania({ titulo, onCerrar, children }) {
  const dialogoRef = useDialogo({ onCerrar });

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-6 lg:pb-24">
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
              className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              <span aria-hidden="true" className="material-symbols-outlined block text-[20px]">
                close
              </span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
