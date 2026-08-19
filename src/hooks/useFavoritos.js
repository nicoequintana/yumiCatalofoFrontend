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

function escribirFavoritos(ids) {
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

  function esFavorito(id) {
    return favoritos.includes(id);
  }

  function toggleFavorito(id) {
    const agregando = !favoritos.includes(id);
    const siguiente = agregando ? [...favoritos, id] : favoritos.filter((f) => f !== id);
    escribirFavoritos(siguiente);

    // Social-proof counter: only fires when ADDING a favorite, never on
    // removal (spec: an approximate "this got saved N times" signal, not a
    // precise live count — decrementing is intentionally not wanted).
    // Fire-and-forget, never awaited: must not block the local toggle.
    if (agregando) {
      registrarFavorito(id);
    }
  }

  function establecerFavoritos(ids) {
    escribirFavoritos(ids);
  }

  return { favoritos, esFavorito, toggleFavorito, establecerFavoritos };
}

export default useFavoritos;
