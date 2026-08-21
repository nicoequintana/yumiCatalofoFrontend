import { useEffect, useState } from "react";
import { registrarFavorito } from "../api/products.js";

const STORAGE_KEY = "yumi-favoritos";
const listeners = new Set();

function leerFavoritos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Module-level source of truth for the current favorites, kept in sync with
// every write via `escribirFavoritos`. Mutators read FROM HERE instead of
// their own hook instance's `favoritos` closure (captured at last render).
// Reason: `/coleccion` mounts a dozen hearts at once, and two of them can
// each call a mutator in the same tick, before either re-renders — both
// would otherwise compute "next" from the same stale render-time closure,
// and the second write clobbers the first (favoriting A then B would leave
// only B). Reading `favoritosActuales` instead makes every mutation see the
// latest write, regardless of which instance's render last captured it.
// Same pattern as useCarrito.js's `carritoActual`.
let favoritosActuales = leerFavoritos();

function escribirFavoritos(ids) {
  favoritosActuales = ids;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // localStorage can throw (quota exceeded, private browsing storage
    // restrictions, storage disabled) — this is best-effort persistence for
    // a soft feature, so a failed write should still update in-memory state
    // for the current session instead of crashing the click handler.
  }
  listeners.forEach((listener) => listener(ids));
}

/**
 * Reemplaza la lista completa de favoritos.
 *
 * Acepta un array o un ACTUALIZADOR `(actuales) => siguientes`, igual que el
 * `setState(prev => …)` de React. La forma funcional recibe
 * `favoritosActuales`, o sea el valor vigente en el momento de la llamada, no
 * el que capturó el último render de quien la invoca — que es exactamente lo
 * que necesita cualquier consumidor que decida sobre los favoritos DESPUÉS de
 * un await (ver `Favoritos.jsx`: entre que arranca el fetch y llega la
 * respuesta, el usuario puede tocar un corazón, y escribir el array viejo
 * resucitaría el favorito que acaba de sacar).
 *
 * Si el actualizador devuelve el mismo array que recibió, no se escribe ni se
 * notifica a nadie — la convención de "devolvé `prev` para no hacer nada" de
 * React, útil para reconciliaciones que la mayoría de las veces no cambian
 * nada.
 *
 * Vive a nivel de módulo, no adentro del hook, así su identidad es ESTABLE
 * entre renders: los consumidores pueden ponerla en el array de dependencias
 * de un `useEffect` sin provocar re-ejecuciones. No envolverla en una función
 * nueva al devolverla desde el hook.
 */
function establecerFavoritos(idsOActualizador) {
  const actuales = favoritosActuales;
  const siguientes =
    typeof idsOActualizador === "function" ? idsOActualizador(actuales) : idsOActualizador;

  if (siguientes === actuales) return;

  escribirFavoritos(siguientes);
}

/**
 * Favorites are stored as a JSON array of product ids under one
 * localStorage key. Multiple components (Navbar's count badge, each
 * ProductCard's heart, the detail page's heart) can each hold their own
 * instance of this hook and stay in sync: writes go through
 * `escribirFavoritos`, which notifies every mounted instance via a
 * module-level listener set (no context provider needed for this app's
 * scale, per CLAUDE.md's "no heavy state libraries" convention).
 */
function useFavoritos() {
  const [favoritos, setFavoritos] = useState(() => leerFavoritos());

  useEffect(() => {
    listeners.add(setFavoritos);
    return () => {
      listeners.delete(setFavoritos);
    };
  }, []);

  // A diferencia de los mutadores, `esFavorito` SÍ lee el estado de render:
  // es lo que pinta el corazón, y tiene que coincidir con lo que el usuario
  // está viendo en este render, no con una escritura posterior.
  function esFavorito(id) {
    return favoritos.includes(id);
  }

  function toggleFavorito(id) {
    const actual = favoritosActuales;
    const agregando = !actual.includes(id);
    const siguiente = agregando ? [...actual, id] : actual.filter((f) => f !== id);
    escribirFavoritos(siguiente);

    // Social-proof counter: only fires when ADDING a favorite, never on
    // removal (spec: an approximate "this got saved N times" signal, not a
    // precise live count — decrementing is intentionally not wanted).
    // Fire-and-forget, never awaited: must not block the local toggle.
    if (agregando) {
      registrarFavorito(id);
    }
  }

  return { favoritos, esFavorito, toggleFavorito, establecerFavoritos };
}

export default useFavoritos;
