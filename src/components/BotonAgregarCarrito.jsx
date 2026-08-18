import { useState } from "react";
import SelectorCantidad from "./SelectorCantidad.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { registrarEvento } from "../api/products.js";

/**
 * Price-panel CTA for the product detail page (Sprint 5 Task 2) — the first
 * CTA that panel has ever had (see ProductoDetalle.jsx's doc comment on the
 * prior "no CTA" decision, now superseded by the cart feature).
 *
 * Disabled whenever `producto.disponibilidad === "AGOTADO"`: the panel's
 * Badge already shows "Agotado" for context, this button just backs off and
 * shows a short inline note instead of letting the user add unavailable
 * stock to the cart.
 */
function BotonAgregarCarrito({ producto }) {
  const { agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  const agotado = producto.disponibilidad === "AGOTADO";

  function handleClick() {
    agregar(producto.id, cantidad);

    // Fire-and-forget analytics, same non-blocking pattern as
    // BotonCompartir/BotonFavorito — never awaited, never allowed to affect
    // the button's own success feedback below.
    registrarEvento("AGREGADO_CARRITO", producto.id);

    setAgregado(true);
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
        className="font-label-md text-label-md inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 uppercase tracking-wide text-on-primary hover:opacity-90"
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
