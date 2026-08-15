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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
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

  return { favoritos, esFavorito, toggleFavorito };
}

export default useFavoritos;
