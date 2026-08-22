import { useEffect, useState } from "react";

export const STORAGE_KEY = "yumi-carrito";
const listeners = new Set();

// Una línea corrupta en storage (cantidad null/"abc"/negativa, id inválido —
// posible por una versión vieja del shape o una edición manual) produciría
// `cantidadTotal: NaN` en el badge del Navbar. Se filtra al leer: solo
// enteros positivos en ambos campos.
function esLineaValida(linea) {
  return (
    linea !== null &&
    typeof linea === "object" &&
    Number.isInteger(linea.productId) &&
    linea.productId > 0 &&
    Number.isInteger(linea.cantidad) &&
    linea.cantidad > 0
  );
}

function leerCarrito() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(esLineaValida) : [];
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

// Sincronización entre pestañas: el evento `storage` se dispara en las DEMÁS
// pestañas cuando una escribe (nunca en la que escribió, que ya se notificó
// vía `escribirCarrito`). Se relee el valor y se notifica a los listeners
// locales SIN volver a escribir — escribir acá dispararía el evento en la
// pestaña original y entraría en loop. Un valor corrupto o ausente cae a []
// por el mismo camino que la lectura inicial (`leerCarrito`). `key === null`
// es un `storage.clear()`, que también afecta a esta clave.
function manejarStorageDeOtraPestana(evento) {
  if (evento.key !== null && evento.key !== STORAGE_KEY) return;
  const lineas = leerCarrito();
  carritoActual = lineas;
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
    // El listener de `storage` es uno solo por pestaña: se registra cuando
    // monta la primera instancia y se quita cuando desmonta la última —
    // mismo criterio de ciclo de vida que el atributo del DOM en
    // `useTemaAdmin`. (`addEventListener` con la misma función deduplica,
    // así que el guard es economía, no corrección.)
    if (listeners.size === 0) {
      // Mientras no hubo instancias montadas tampoco hubo listener de
      // `storage`: lo que otra pestaña escribió en ese lapso nunca actualizó
      // `carritoActual`. El initializer del estado ya leyó el valor fresco
      // para ESTA instancia; acá se realinea el estado de módulo para que la
      // primera mutación no parta del valor viejo y pise esa escritura.
      carritoActual = leerCarrito();
      window.addEventListener("storage", manejarStorageDeOtraPestana);
    }
    listeners.add(setCarrito);
    return () => {
      listeners.delete(setCarrito);
      if (listeners.size === 0) {
        window.removeEventListener("storage", manejarStorageDeOtraPestana);
      }
    };
  }, []);

  function agregar(productId, cantidad = 1) {
    // Guard against non-positive OR non-integer quantities (NaN included:
    // `Math.max(1, NaN)` is NaN, so the old floor didn't cover it).
    // `agregar(id, -5)` must not silently shrink or delete a line — only
    // `actualizarCantidad`/`quitar` are allowed to do that, and only
    // explicitly. Adding always adds.
    const cantidadValida = Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1;
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
    // NaN o una cantidad no entera no tienen representación posible en una
    // línea: se ignora en vez de escribir basura (NaN <= 0 es false, así que
    // sin este guard una cantidad NaN pasaba de largo y quedaba persistida).
    if (!Number.isInteger(cantidad)) return;
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
