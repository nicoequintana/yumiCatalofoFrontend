const ESTILOS_TIPO = {
  info: "bg-surface-container-lowest text-on-surface border-outline-variant",
  error: "bg-error-container text-on-error-container border-error-container",
  exito: "bg-secondary-container text-on-secondary-container border-secondary-container",
};

const ICONO_TIPO = {
  info: "info",
  error: "error",
  exito: "check_circle",
};

/**
 * Notificación flotante temporal, montada por `ToastProvider` (ver
 * `context/ToastContext.jsx`) — un solo toast visible a la vez, siempre en
 * la misma posición (abajo-centro en mobile, abajo-derecha en desktop, sobre
 * cualquier CTA sticky que pueda haber en la página gracias al z-index alto).
 */
function Toast({ mensaje, tipo = "info", onCerrar }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-[60] flex justify-center md:inset-x-auto md:bottom-6 md:right-6 md:justify-end"
    >
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-ambient ${ESTILOS_TIPO[tipo]}`}
      >
        <span className="material-symbols-outlined text-[20px]">{ICONO_TIPO[tipo]}</span>
        <p className="font-body-md text-body-md">{mensaje}</p>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar notificación"
          className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}

export default Toast;
