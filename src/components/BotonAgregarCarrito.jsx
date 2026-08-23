import { useEffect, useRef, useState } from "react";
import SelectorCantidad from "./SelectorCantidad.jsx";
import useCarrito from "../hooks/useCarrito.js";
import { registrarEvento } from "../api/products.js";

/**
 * Price-panel CTA for the product detail page (Sprint 5 Task 2) — the first
 * CTA that panel has ever had (see ProductoDetalle.jsx's doc comment on the
 * prior "no CTA" decision, now superseded by the cart feature).
 */
function BotonAgregarCarrito({ producto, alineacion = "end", compacto = false }) {
  const { carrito, agregar } = useCarrito();
  const [cantidad, setCantidad] = useState(1);
  const [agregado, setAgregado] = useState(false);

  // El timer de feedback se guarda para limpiarlo al desmontar: en React 18
  // un setState tras el unmount es un no-op silencioso, pero el timer queda
  // vivo igual — y un click justo antes de navegar lo dejaba colgado.
  const timerRef = useRef(null);
  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Un producto agotado se sigue mostrando en su ficha, pero no se puede
  // comprar: el CTA queda deshabilitado. El backend rechaza igual la orden
  // (`ordenes.controller.js`), así que esto es UX, no la defensa real.
  const sinStock = producto.stock <= 0;

  // Clamp contra el stock VIVO, solo cuando se lo conoce (un payload sin el
  // campo no inventa tope). Lo ya agregado al carrito descuenta margen: con
  // stock 2 y 1 en el carrito solo se puede agregar 1 más — sin esto el
  // backend aceptaba la orden imposible de cumplir (valida stock > 0, no
  // cantidad contra stock).
  const stockConocido = Number.isInteger(producto.stock);
  const enCarrito = carrito.find((l) => l.productId === producto.id)?.cantidad ?? 0;
  const disponible = stockConocido ? Math.max(0, producto.stock - enCarrito) : null;
  // Extiende el estado deshabilitado de `sinStock`: hay stock, pero ya está
  // todo en el carrito. Etiqueta propia para no mentir con "Sin stock".
  const sinMargen = stockConocido && !sinStock && disponible === 0;
  // Lo que se muestra es lo que se agrega: si el margen bajó por debajo de lo
  // seleccionado (otro click, otra pestaña), el selector lo refleja en vez de
  // agregar en silencio menos de lo que el número decía.
  const cantidadEfectiva = disponible !== null && disponible > 0 ? Math.min(cantidad, disponible) : cantidad;

  function handleClick() {
    if (sinStock || sinMargen) return;

    // Re-entrancy guard: while `agregado` is true (the whole 2.5s feedback
    // window, not just the click instant) a second click/tap is a no-op.
    // Without this, a fast double-click/double-tap calls `agregar` twice —
    // double the selected quantity in the cart plus a duplicate
    // AGREGADO_CARRITO event.
    if (agregado) return;

    agregar(producto.id, cantidadEfectiva);

    // Fire-and-forget analytics, same non-blocking pattern as
    // BotonCompartir/BotonFavorito — never awaited, never allowed to affect
    // the button's own success feedback below.
    registrarEvento("AGREGADO_CARRITO", producto.id);

    setAgregado(true);
    // Reset the selector back to its default: adding confirms the chosen
    // quantity, the next decision starts fresh at 1 instead of silently
    // reusing the last value on a later click.
    setCantidad(1);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setAgregado(false), 2500);
  }

  const deshabilitado = sinStock || sinMargen;

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${alineacion === "start" ? "justify-start" : "justify-end"}`}
    >
      {deshabilitado ? null : (
        <SelectorCantidad
          value={cantidadEfectiva}
          onChange={setCantidad}
          max={disponible ?? undefined}
          compacto={compacto}
        />
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={agregado || deshabilitado}
        className={`font-label-md text-label-md inline-flex items-center gap-2 rounded-full bg-primary uppercase tracking-wide text-on-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 ${
          compacto ? "h-9 px-4" : "h-10 px-6"
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">
          {deshabilitado ? "remove_shopping_cart" : agregado ? "check" : "shopping_cart"}
        </span>
        {sinStock
          ? "Sin stock"
          : sinMargen
            ? "Máximo en carrito"
            : agregado
              ? "Agregado ✓"
              : compacto
                ? "Agregar"
                : "Agregar al carrito"}
      </button>
    </div>
  );
}

export default BotonAgregarCarrito;
