import { useState } from "react";
import SelectorCantidad from "./SelectorCantidad.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { registrarEvento } from "../api/products.js";

/**
 * Price-panel CTA for the product detail page (Sprint 5 Task 2) — the first
 * CTA that panel has ever had (see ProductoDetalle.jsx's doc comment on the
 * prior "no CTA" decision, now superseded by the cart feature).
 */
function BotonAgregarCarrito({ producto, alineacion = "end" }) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

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

  return (
    <div className={`flex flex-col gap-3 ${alineacion === "start" ? "items-start" : "items-end"}`}>
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
