/**
 * Small +/− quantity stepper. Decrementing below `min` (defaults to 1, since
 * an active cart line can't display quantity 0 through this widget) is a
 * no-op — `onChange` simply isn't called, it never fires with `min - 1`.
 * This is a UI-only floor: it does NOT enforce cart business rules like
 * `useCarrito`'s `actualizarCantidad(id, 0)` removing a line — that's a
 * separate, deliberate behavior reachable from other code paths (e.g. a
 * "remove" action), not from this widget's own decrement button.
 */
function SelectorCantidad({ value, onChange, min = 1 }) {
  function disminuir() {
    if (value <= min) return;
    onChange(value - 1);
  }

  function aumentar() {
    onChange(value + 1);
  }

  return (
    <div className="inline-flex items-center gap-3">
      <button
        type="button"
        onClick={disminuir}
        aria-label="Disminuir cantidad"
        disabled={value <= min}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant disabled:opacity-40"
      >
        <span className="material-symbols-outlined text-[18px]">remove</span>
      </button>
      <span className="min-w-[1.5rem] text-center font-body-md text-body-md">{value}</span>
      <button
        type="button"
        onClick={aumentar}
        aria-label="Aumentar cantidad"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
      </button>
    </div>
  );
}

export default SelectorCantidad;
