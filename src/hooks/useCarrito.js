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

// Module-level source of truth for the current cart, kept in sync with
// every write via `escribirCarrito`. Mutators read FROM HERE instead of
// their own hook instance's `carrito` closure (captured at last render).
// Reason: two mounted instances can each call a mutator in the same tick,
// before either re-renders — both would otherwise compute "next" from the
// same stale render-time closure, and the second write clobbers the first
// (e.g. two `agregar(id, 1)` racing would net cantidad: 1 instead of 2).
// Reading `carritoActual` instead makes every mutation see the latest
// write, regardless of which instance's render last captured it.
let carritoActual = leerCarrito();

function escribirCarrito(lineas) {
  carritoActual = lineas;
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
    // Guard against non-positive quantities: `agregar(id, -5)` must not
    // silently shrink or delete a line — only `actualizarCantidad`/`quitar`
    // are allowed to do that, and only explicitly. Adding always adds.
    const cantidadValida = Math.max(1, cantidad);
    const actual = carritoActual;
    const existente = actual.find((linea) => linea.productId === productId);
    const siguiente = existente
      ? actual.map((linea) =>
          linea.productId === productId
            ? { ...linea, cantidad: linea.cantidad + cantidadValida }
            : linea,
        )
      : [...actual, { productId, cantidad: cantidadValida }];
    escribirCarrito(siguiente);
  }

  function quitar(productId) {
    escribirCarrito(carritoActual.filter((linea) => linea.productId !== productId));
  }

  /**
   * Sets a line's quantity directly. Deliberate design decision:
   * `cantidad <= 0` REMOVES the line entirely instead of leaving a
   * zero-or-negative-quantity line in the cart — same effect as `quitar`.
   * A line with cantidad <= 0 has no meaningful UI representation (nothing
   * to display/checkout), so this API collapses that state instead of
   * letting callers create it.
   * @param {number} productId
   * @param {number} cantidad - new quantity; `<= 0` removes the line.
   */
  function actualizarCantidad(productId, cantidad) {
    if (cantidad <= 0) {
      quitar(productId);
      return;
    }
    escribirCarrito(
      carritoActual.map((linea) =>
        linea.productId === productId ? { ...linea, cantidad } : linea,
      ),
    );
  }

  function vaciar() {
    escribirCarrito([]);
  }

  const cantidadTotal = carrito.reduce((total, linea) => total + linea.cantidad, 0);

  return { carrito, agregar, quitar, actualizarCantidad, vaciar, cantidadTotal };
}

export default useCarrito;
