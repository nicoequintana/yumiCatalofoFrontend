import { useEffect, useState } from "react";

export const STORAGE_KEY = "yumi-carrito";
const listeners = new Set();

/**
 * ¿Se puede escribir en localStorage AHORA? No cachea: un storage bloqueado
 * puede desbloquearse entre un chequeo y el siguiente (el usuario cambia el
 * permiso del sitio sin recargar), así que cada llamado prueba de nuevo.
 *
 * Se prueba con un ESCRIBE+BORRA real, no con `typeof localStorage`: un
 * storage "bloqueado por política" (Chrome, "bloquear todas las cookies")
 * existe como objeto pero lanza `SecurityError` recién al usarlo — la
 * detección tiene que ejercitarlo, no solo verificar que exista.
 */
export function storageDisponible() {
  try {
    const clave = "__yumi_sonda__";
    localStorage.setItem(clave, "1");
    localStorage.removeItem(clave);
    return true;
  } catch {
    return false;
  }
}

// Una línea corrupta en storage (cantidad null/"abc"/negativa, id inválido —
// posible por una versión vieja del shape o una edición manual) produciría
// `cantidadTotal: NaN` en el badge del Navbar. Se filtra al leer: solo
// enteros positivos en ambos campos. Una línea es de producto O de combo,
// nunca las dos ni ninguna — ver spec 7.7.
export function esLineaValida(linea) {
  if (linea === null || typeof linea !== "object") return false;
  const esProducto = Number.isInteger(linea.productId) && linea.productId > 0;
  const esCombo = Number.isInteger(linea.comboId) && linea.comboId > 0;
  // Exactamente una de las dos: una línea con ambas o con ninguna es basura.
  if (esProducto === esCombo) return false;
  if (linea.productId !== undefined && linea.comboId !== undefined) return false;
  return Number.isInteger(linea.cantidad) && linea.cantidad > 0;
}

/** Por qué campo se identifica una línea: `productId` o `comboId`. */
function claveDe(referencia) {
  return referencia.productId !== undefined ? "productId" : "comboId";
}

function coincide(linea, referencia) {
  const clave = claveDe(referencia);
  return linea[clave] === referencia[clave];
}

/**
 * Lee el carrito del storage, o `null` si el storage NO SE PUDO LEER.
 *
 * La distincion importa: `[]` significa "el storage anduvo y no hay carrito",
 * mientras que `null` significa "no sabemos" —modo privado, storage bloqueado,
 * la misma falla que detecta `storageDisponible()`—. Confundirlos hacia `[]`
 * borraba el carrito en memoria de toda instancia que montara despues de una
 * escritura fallida: se agregaba en la ficha, el Checkout montaba fresco, leia
 * vacio y redirigia a /carrito. El carrito se evaporaba al ir a comprar.
 */
function leerCarrito() {
  let crudo;
  try {
    crudo = localStorage.getItem(STORAGE_KEY);
  } catch {
    // No se pudo ACCEDER al storage: no hay dato, ni siquiera uno vacio.
    return null;
  }

  try {
    const parsed = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(parsed) ? parsed.filter(esLineaValida) : [];
  } catch {
    // El storage SI se leyo y lo que habia es basura: eso es un carrito vacio,
    // no una incognita. Confundirlo con `null` dejaria vivo para siempre un
    // carrito en memoria que el storage ya no puede corregir.
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
let carritoActual = leerCarrito() ?? [];

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
  // Storage ilegible: el evento no trae informacion utilizable, y tomar []
  // vaciaria un carrito bueno que solo vive en memoria.
  if (lineas === null) return;
  carritoActual = lineas;
  listeners.forEach((listener) => listener(lineas));
}

/**
 * Cart lines are stored as a JSON array of `{ productId, cantidad }` or
 * `{ comboId, cantidad }` objects under one localStorage key. Multiple components (a future
 * BotonAgregarCarrito, Navbar's cart-count badge, the future Carrito page)
 * can each hold their own instance of this hook and stay in sync: writes go
 * through `escribirCarrito`, which notifies every mounted instance via a
 * module-level listener set (no context provider needed for this app's
 * scale, per CLAUDE.md's "no heavy state libraries" convention). Mirrors
 * useFavoritos.js's architecture exactly.
 */
function useCarrito() {
  const [carrito, setCarrito] = useState(() => leerCarrito() ?? carritoActual);

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
      const desdeStorage = leerCarrito();
      if (desdeStorage !== null) carritoActual = desdeStorage;
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

  function agregar(referencia, cantidad = 1) {
    // Guard against non-positive OR non-integer quantities (NaN included:
    // `Math.max(1, NaN)` is NaN, so the old floor didn't cover it).
    // `agregar(referencia, -5)` must not silently shrink or delete a line —
    // only `actualizarCantidad`/`quitar` are allowed to do that, and only
    // explicitly. Adding always adds.
    const cantidadValida = Number.isInteger(cantidad) && cantidad > 0 ? cantidad : 1;
    const clave = claveDe(referencia);
    const actual = carritoActual;
    const existente = actual.find((linea) => coincide(linea, referencia));
    const siguiente = existente
      ? actual.map((linea) =>
          coincide(linea, referencia) ? { ...linea, cantidad: linea.cantidad + cantidadValida } : linea,
        )
      : [...actual, { [clave]: referencia[clave], cantidad: cantidadValida }];
    escribirCarrito(siguiente);
  }

  function quitar(referencia) {
    escribirCarrito(carritoActual.filter((linea) => !coincide(linea, referencia)));
  }

  /**
   * Sets a line's quantity directly. Deliberate design decision:
   * `cantidad <= 0` REMOVES the line entirely instead of leaving a
   * zero-or-negative-quantity line in the cart — same effect as `quitar`.
   * A line with cantidad <= 0 has no meaningful UI representation (nothing
   * to display/checkout), so this API collapses that state instead of
   * letting callers create it.
   * @param {{productId: number}|{comboId: number}} referencia
   * @param {number} cantidad - new quantity; `<= 0` removes the line.
   */
  function actualizarCantidad(referencia, cantidad) {
    // NaN o una cantidad no entera no tienen representación posible en una
    // línea: se ignora en vez de escribir basura (NaN <= 0 es false, así que
    // sin este guard una cantidad NaN pasaba de largo y quedaba persistida).
    if (!Number.isInteger(cantidad)) return;
    if (cantidad <= 0) {
      quitar(referencia);
      return;
    }
    escribirCarrito(
      carritoActual.map((linea) => (coincide(linea, referencia) ? { ...linea, cantidad } : linea)),
    );
  }

  function vaciar() {
    escribirCarrito([]);
  }

  const cantidadTotal = carrito.reduce((total, linea) => total + linea.cantidad, 0);

  return { carrito, agregar, quitar, actualizarCantidad, vaciar, cantidadTotal };
}

export default useCarrito;
