import { useState } from "react";
import SelectorCantidad from "./SelectorCantidad.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { registrarEvento } from "../api/products.js";

/**
 * Price-panel CTA for the product detail page (Sprint 5 Task 2) — the first
 * CTA that panel has ever had (see ProductoDetalle.jsx's doc comment on the
 * prior "no CTA" decision, now superseded by the cart feature).
 *
 * `agotado` originally disabled this button whenever
 * `producto.disponibilidad === "AGOTADO"`, showing "No disponible" instead.
 * That gate is now dead-by-design (product-decision correction, same reason
 * as `Badge.jsx`'s `disponibilidad` no-op): no real stock-management
 * workflow exists yet, so the public "agregar al carrito" flow must stay
 * available regardless of `disponibilidad` — the backend's own
 * `POST /api/ordenes` check is the real, still-active defense against
 * ordering an AGOTADO product, independent of what this button does. The
 * `agotado` variable and its branch below are kept, just forced off, so this
 * can be re-enabled later without touching data or plumbing.
 */
function BotonAgregarCarrito({ producto }) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  // Forced `false`: see doc comment above. `producto.disponibilidad` is
  // still read here (not deleted) so re-enabling is a one-line revert.
  const agotado = false && producto.disponibilidad === "AGOTADO";

  function handleClick() {
    // Re-entrancy guard: while `agregado` is true (the whole 2.5s feedback
    // window, not just the click instant) a second click/tap is a no-op.
    // Without this, a fast double-click/double-tap calls `agregar` twice —
    // double the selected quantity in the cart plus a duplicate
    // AGREGADO_CARRITO event.
    if (agregado) return;

    agregar(producto.id, cantidad);

    // Fire-and-forget analytics, same non-blocking pattern as
    // BotonCompartir/BotonFavorito — never awaited, never allowed to affect
    // the button's own success feedback below.
    registrarEvento("AGREGADO_CARRITO", producto.id);

    setAgregado(true);
    // Reset the selector back to its default: adding confirms the chosen
    // quantity, the next decision starts fresh at 1 instead of silently
    // reusing the last value on a later click.
    setCantidad(1);
    setTimeout(() => setAgregado(false), 2500);
  }

  if (agotado) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled
          className="font-label-md text-label-md rounded-full bg-outline-variant px-6 py-3 uppercase tracking-wide text-on-surface-variant opacity-60"
        >
          No disponible
        </button>
        <span className="font-body-md text-body-md text-on-surface-variant">
          Este producto está agotado.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <SelectorCantidad value={cantidad} onChange={setCantidad} />
      <button
        type="button"
        onClick={handleClick}
        disabled={agregado}
        className="font-label-md text-label-md inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 uppercase tracking-wide text-on-primary hover:opacity-90 disabled:opacity-70"
      >
        <span className="material-symbols-outlined text-[18px]">
          {agregado ? "check" : "shopping_cart"}
        </span>
        {agregado ? "Agregado ✓" : "Agregar al carrito"}
      </button>
    </div>
  );
}

export default BotonAgregarCarrito;
