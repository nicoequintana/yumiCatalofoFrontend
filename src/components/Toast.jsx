import { Link } from "react-router-dom";

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
 * `context/ToastContext.jsx`) — un solo toast visible a la vez. Posición por
 * breakpoint: arriba-centro en mobile (debajo del navbar sticky y de la
 * cinta de ambiente, mismo contrato de dos puntas que `FiltrosCatalogo.jsx`,
 * ver `docs/reglas/diseno-y-tema.md`), abajo-derecha en desktop, sobre
 * cualquier CTA sticky que pueda haber en la página gracias al z-index alto.
 *
 * `foto` (`{ url, alt }`) y `accion` (`{ texto, to }`, ruta de
 * react-router-dom) son OPCIONALES — ver `context/useToast.js`.
 */
function Toast({ mensaje, tipo = "info", foto = null, accion = null, onCerrar }) {
  return (
    <div
      role="status"
      aria-live="polite"
      // ⚠️ El `calc()` va con espacios ESCAPADOS como `_+_`, no concatenado
      // sin espacios: CSS exige espacio a los dos lados de `+`/`-` dentro de
      // `calc()`, y sin eso el navegador descarta el valor entero sin error
      // ni warning — mismo modo de falla silenciosa que el resto de esta
      // familia de bugs (ver "Diseño, tokens y tema"). Mismo patrón que ya
      // usan `FiltrosCatalogo.jsx` y `EditorTabs.jsx`.
      className="fixed inset-x-4 top-[calc(var(--alto-cinta-ambiente)_+_theme(spacing.navbar-height)_+_0.75rem)] z-[60] flex justify-center md:inset-x-auto md:top-auto md:bottom-6 md:right-6 md:justify-end"
    >
      <div
        className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-ambient ${ESTILOS_TIPO[tipo]}`}
      >
        {foto ? (
          <img src={foto.url} alt={foto.alt} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        ) : (
          <span className="material-symbols-outlined text-[20px]">{ICONO_TIPO[tipo]}</span>
        )}
        <p className="font-body-md text-body-md flex-1">{mensaje}</p>
        {accion ? (
          <Link
            to={accion.to}
            className="font-label-md text-label-md shrink-0 whitespace-nowrap text-primary-container underline-offset-2 hover:underline"
          >
            {accion.texto}
          </Link>
        ) : null}
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
