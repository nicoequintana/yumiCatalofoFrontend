/**
 * El interruptor de los formularios de campaña.
 *
 * Es un `<button role="switch">` y no un checkbox porque toda la superficie de
 * la fila tiene que ser clickeable: son opciones que se leen como una frase
 * ("En el catálogo público"), no como una casilla suelta.
 *
 * `aria-checked` es el estado real que lee un lector de pantalla; la pastilla de
 * la derecha va `aria-hidden` porque es la MISMA información dibujada. Sin eso
 * el estado se anunciaría dos veces.
 */
export default function Interruptor({ etiqueta, activo, onCambiar, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      disabled={disabled}
      onClick={() => onCambiar(!activo)}
      className="flex w-full items-center justify-between gap-4 rounded-lg border border-outline-variant px-4 py-3 text-left transition-colors hover:bg-surface-container disabled:opacity-60"
    >
      <span className="font-body-md text-body-md text-on-surface">{etiqueta}</span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          activo ? "bg-primary" : "bg-outline-variant"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-surface-container-lowest transition-transform ${
            activo ? "translate-x-5" : ""
          }`}
        />
      </span>
    </button>
  );
}
