import { useEffect, useState } from "react";

const STORAGE_KEY = "aura-favoritos";
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
    const siguiente = favoritos.includes(id) ? favoritos.filter((f) => f !== id) : [...favoritos, id];
    escribirFavoritos(siguiente);
  }

  function establecerFavoritos(ids) {
    escribirFavoritos(ids);
  }

  return { favoritos, esFavorito, toggleFavorito, establecerFavoritos };
}

export default useFavoritos;
