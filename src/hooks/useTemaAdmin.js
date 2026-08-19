import { useEffect, useState } from "react";

export const STORAGE_KEY = "yumi-tema-admin";

const TEMA_CLARO = "claro";
const TEMA_OSCURO = "oscuro";
const TEMAS_VALIDOS = [TEMA_CLARO, TEMA_OSCURO];

const listeners = new Set();

function leerTema() {
  try {
    const guardado = localStorage.getItem(STORAGE_KEY);
    return TEMAS_VALIDOS.includes(guardado) ? guardado : TEMA_CLARO;
  } catch {
    return TEMA_CLARO;
  }
}

/**
 * The dark palette lives in `index.css` under `[data-tema-admin="oscuro"]`,
 * so light mode is simply the absence of the attribute — the `:root`
 * defaults already are the light palette. Removing it instead of writing
 * `"claro"` keeps a single source of truth for the light values.
 */
function marcarDom(tema) {
  if (tema === TEMA_OSCURO) {
    document.documentElement.dataset.temaAdmin = TEMA_OSCURO;
  } else {
    delete document.documentElement.dataset.temaAdmin;
  }
}

function escribirTema(tema) {
  try {
    localStorage.setItem(STORAGE_KEY, tema);
  } catch {
    // localStorage can throw (quota exceeded, private browsing restrictions,
    // storage disabled). This is a cosmetic preference, so a failed write
    // must still repaint the current session instead of breaking the toggle.
  }
  marcarDom(tema);
  listeners.forEach((listener) => listener(tema));
}

/**
 * Applies the persisted theme to the DOM before React mounts, so the admin
 * panel never flashes light for a frame before the hook's first effect runs.
 * Called once from `main.jsx`.
 */
export function aplicarTemaGuardado() {
  marcarDom(leerTema());
}

/** Test helper: drops the attribute and any leftover listeners. */
export function limpiarTema() {
  listeners.clear();
  delete document.documentElement.dataset.temaAdmin;
}

/**
 * Dark mode for the admin panel only — a per-browser preference stored in
 * localStorage, never a global site setting: the public catalog is always
 * light and is not affected by this toggle.
 *
 * The whole panel repaints without touching a single admin component,
 * because every color token in `tailwind.config.js` already resolves to a
 * `var(--color-*)` custom property. Switching the theme only redefines
 * those properties under `[data-tema-admin="oscuro"]`, which is why there
 * are no `dark:` variants anywhere in the admin markup.
 *
 * Multiple mounted instances stay in sync through a module-level listener
 * set, the same pattern as `useFavoritos`/`useCarrito` (no context provider,
 * per CLAUDE.md's "no heavy state libraries" convention). The DOM attribute
 * is cleared only when the last instance unmounts — that is, when the admin
 * navigates away from the panel — so the public catalog goes back to light.
 */
function useTemaAdmin() {
  const [tema, setTema] = useState(() => leerTema());

  useEffect(() => {
    marcarDom(tema);
    listeners.add(setTema);
    return () => {
      listeners.delete(setTema);
      if (listeners.size === 0) {
        delete document.documentElement.dataset.temaAdmin;
      }
    };
    // Runs once on mount: `tema` is only read to restore the persisted value
    // before the first paint. Later changes go through `escribirTema`, which
    // marks the DOM itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function alternarTema() {
    escribirTema(tema === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO);
  }

  return { tema, esOscuro: tema === TEMA_OSCURO, alternarTema };
}

export default useTemaAdmin;
