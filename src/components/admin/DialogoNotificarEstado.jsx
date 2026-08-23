import useDialogo from "../../hooks/useDialogo.js";
import { ETIQUETA_ESTADO } from "../../constants/ordenes.js";

/**
 * Diálogo que se interpone entre elegir un estado nuevo y guardarlo, para que
 * el admin decida si además se le avisa al cliente por mail.
 *
 * Aparece en TODAS las transiciones, incluidas CANCELADA y un retroceso a
 * PENDIENTE: una sola regla sin excepciones que recordar, y el admin decide
 * caso por caso, que es exactamente para lo que existe. Si no quiere avisar de
 * una corrección interna, elige "Guardar sin notificar".
 *
 * PRESENTACIONAL PURO: no llama a la API ni conoce la orden más allá de lo
 * que recibe por props. Guardar es responsabilidad de `AdminOrdenDetalle`.
 *
 * La semántica de diálogo (foco inicial, trampa de foco, Escape, restauración
 * del foco al cerrar) viene del hook compartido `useDialogo` — el mismo que
 * usan `Lightbox`, `Navbar` y `AdminProductos`. Escribirla a mano acá sería
 * una regresión.
 *
 * @param {object} props
 * @param {number} props.ordenId
 * @param {string} props.estadoAnterior - clave cruda del estado actual
 * @param {string} props.estadoNuevo - clave cruda del estado elegido
 * @param {string|null} props.emailCliente - null en órdenes anteriores a que
 *   el email fuera obligatorio en el checkout
 * @param {boolean} props.guardando
 * @param {(notificar: boolean) => void} props.onConfirmar
 * @param {() => void} props.onCancelar
 */
function DialogoNotificarEstado({
  ordenId,
  estadoAnterior,
  estadoNuevo,
  emailCliente,
  guardando,
  onConfirmar,
  onCancelar,
}) {
  const contenedorRef = useDialogo({ abierto: true, onCerrar: onCancelar });

  const etiquetaAnterior = ETIQUETA_ESTADO[estadoAnterior] ?? estadoAnterior;
  const etiquetaNueva = ETIQUETA_ESTADO[estadoNuevo] ?? estadoNuevo;
  const puedeNotificar = Boolean(emailCliente);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 p-4">
      <div
        ref={contenedorRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-notificar-estado"
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl"
      >
        <h2
          id="titulo-notificar-estado"
          className="font-headline-md text-headline-md mb-2 text-on-surface"
        >
          Cambiar el estado de la orden #{ordenId}
        </h2>

        <p className="font-body-md text-body-md mb-4 text-on-surface-variant">
          Pasa de <strong className="text-on-surface">{etiquetaAnterior}</strong> a{" "}
          <strong className="text-on-surface">{etiquetaNueva}</strong>.
        </p>

        {puedeNotificar ? (
          <p className="font-body-md text-body-md mb-6 text-on-surface-variant">
            ¿Le avisamos al cliente por mail a{" "}
            <strong className="break-all text-on-surface">{emailCliente}</strong>?
          </p>
        ) : (
          <p className="font-body-md text-body-md mb-6 rounded-lg bg-tertiary-container px-4 py-3 text-on-surface">
            Este cliente no tiene email registrado, así que no se le puede avisar. Es una orden
            anterior a que el email fuera obligatorio en el checkout.
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => onConfirmar(true)}
            disabled={guardando || !puedeNotificar}
            className="rounded-lg bg-primary px-5 py-3 font-label-md text-label-md text-on-primary disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Notificar y guardar"}
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(false)}
            disabled={guardando}
            className="rounded-lg border border-outline px-5 py-3 font-label-md text-label-md text-on-surface disabled:opacity-50"
          >
            Guardar sin notificar
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={guardando}
            className="rounded-lg px-5 py-3 font-label-md text-label-md text-on-surface-variant disabled:opacity-50 sm:mr-auto"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DialogoNotificarEstado;
