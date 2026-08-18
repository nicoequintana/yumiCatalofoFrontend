import { useEffect, useState } from "react";

const STORAGE_KEY = "yumi-carrito";
const listeners = new Set();

function leerCarrito() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function escribirCarrito(lineas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lineas));
  } catch {
    // localStorage can throw (quota exceeded, private browsing storage
    // restrictions, storage disabled) — this is best-effort persistence for
    // a soft feature, so a failed write should still update in-memory state
    // for the current session instead of crashing the click handler.
  }
  listeners.forEach((listener) => listener(lineas));
}

/**
 * Cart lines are stored as a JSON array of `{ productId, cantidad }` objects
 * under one localStorage key. Multiple components (a future
 * BotonAgregarCarrito, Navbar's cart-count badge, the future Carrito page)
 * can each hold their own instance of this hook and stay in sync: writes go
 * through `escribirCarrito`, which notifies every mounted instance via a
 * module-level listener set (no context provider needed for this app's
 * scale, per CLAUDE.md's "no heavy state libraries" convention). Mirrors
 * useFavoritos.js's architecture exactly.
 */
function useCarrito() {
  const [carrito, setCarrito] = useState(() => leerCarrito());

  useEffect(() => {
    listeners.add(setCarrito);
    return () => {
      listeners.delete(setCarrito);
    };
  }, []);

  function agregar(productId, cantidad = 1) {
    const existente = carrito.find((linea) => linea.productId === productId);
    const siguiente = existente
      ? carrito.map((linea) =>
          linea.productId === productId
            ? { ...linea, cantidad: linea.cantidad + cantidad }
            : linea,
        )
      : [...carrito, { productId, cantidad }];
    escribirCarrito(siguiente);
  }

  function quitar(productId) {
    escribirCarrito(carrito.filter((linea) => linea.productId !== productId));
  }

  // Deliberate design decision: setting cantidad to 0 removes the line
  // entirely instead of leaving a zero-quantity line in the cart — same
  // effect as `quitar`. A line with cantidad 0 has no meaningful UI
  // representation (nothing to display/checkout), so this API collapses
  // that state instead of letting callers create it.
  function actualizarCantidad(productId, cantidad) {
    if (cantidad <= 0) {
      quitar(productId);
      return;
    }
    escribirCarrito(
      carrito.map((linea) => (linea.productId === productId ? { ...linea, cantidad } : linea)),
    );
  }

  function vaciar() {
    escribirCarrito([]);
  }

  const cantidadTotal = carrito.reduce((total, linea) => total + linea.cantidad, 0);

  return { carrito, agregar, quitar, actualizarCantidad, vaciar, cantidadTotal };
}

export default useCarrito;
