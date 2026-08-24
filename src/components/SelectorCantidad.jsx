/**
 * Small +/− quantity stepper. Decrementing below `min` (defaults to 1, since
 * an active cart line can't display quantity 0 through this widget) is a
 * no-op — `onChange` simply isn't called, it never fires with `min - 1`.
 * This is a UI-only floor: it does NOT enforce cart business rules like
 * `useCarrito`'s `actualizarCantidad(id, 0)` removing a line — that's a
 * separate, deliberate behavior reachable from other code paths (e.g. a
 * "remove" action), not from this widget's own decrement button.
 *
 * `max` es opcional y simétrico a `min`: en el tope, incrementar es un no-op
 * y el botón + queda deshabilitado. Sin `max` no hay tope — los llamadores
 * solo lo pasan cuando conocen el stock vivo; el widget no inventa límites.
 */
function SelectorCantidad({ value, onChange, min = 1, max, compacto = false }) {
  const enMaximo = Number.isInteger(max) && value >= max;

  function disminuir() {
    if (value <= min) return;
    onChange(value - 1);
  }

  function aumentar() {
    if (enMaximo) return;
    onChange(value + 1);
  }

  const tamanoBoton = compacto ? "h-9 w-9" : "h-10 w-10";

  return (
    <div className="inline-flex items-stretch overflow-hidden rounded-lg border border-outline-variant">
      <button
        type="button"
        onClick={disminuir}
        aria-label="Disminuir cantidad"
        disabled={value <= min}
        className={`flex items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30 disabled:hover:bg-transparent ${tamanoBoton}`}
      >
        <span className="material-symbols-outlined text-[18px]">remove</span>
      </button>
      <span className="flex min-w-[2.5rem] items-center justify-center border-x border-outline-variant font-body-md text-body-md text-on-surface">
        {value}
      </span>
      <button
        type="button"
        onClick={aumentar}
        aria-label="Aumentar cantidad"
        disabled={enMaximo}
        className={`flex items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-30 disabled:hover:bg-transparent ${tamanoBoton}`}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
      </button>
    </div>
  );
}

export default SelectorCantidad;
