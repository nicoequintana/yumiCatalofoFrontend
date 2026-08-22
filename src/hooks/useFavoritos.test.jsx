import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/products.js", () => ({
  registrarFavorito: vi.fn(),
}));

import { registrarFavorito } from "../api/products.js";
import useFavoritos, { STORAGE_KEY } from "./useFavoritos.js";

describe("useFavoritos — toggleFavorito y registrarFavorito", () => {
  beforeEach(() => {
    // This environment's `localStorage` global is unreliable (Node's
    // `--localstorage-file` flag shadows jsdom's implementation without a
    // configured path), so state is reset through the hook's own API
    // instead of a direct `localStorage.clear()` — `useFavoritos.js` already
    // tolerates a broken localStorage internally (see its try/catch), which
    // is exactly what lets this work as a reset mechanism here.
    const { result } = renderHook(() => useFavoritos());
    act(() => {
      result.current.establecerFavoritos([]);
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispara registrarFavorito al AGREGAR un favorito", () => {
    const { result } = renderHook(() => useFavoritos());

    act(() => {
      result.current.toggleFavorito(7);
    });

    expect(result.current.esFavorito(7)).toBe(true);
    expect(registrarFavorito).toHaveBeenCalledTimes(1);
    expect(registrarFavorito).toHaveBeenCalledWith(7);
  });

  it("NO dispara registrarFavorito al QUITAR un favorito", () => {
    const { result } = renderHook(() => useFavoritos());

    act(() => {
      result.current.toggleFavorito(7); // agrega
    });
    vi.clearAllMocks();

    act(() => {
      result.current.toggleFavorito(7); // quita
    });

    expect(result.current.esFavorito(7)).toBe(false);
    expect(registrarFavorito).not.toHaveBeenCalled();
  });

  it("actualiza el estado local incluso si registrarFavorito rechaza (no bloquea el toggle)", () => {
    registrarFavorito.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useFavoritos());

    expect(() => {
      act(() => {
        result.current.toggleFavorito(9);
      });
    }).not.toThrow();

    expect(result.current.esFavorito(9)).toBe(true);
  });

  it("no pierde un favorito si dos instancias togglean antes de re-renderizar", () => {
    // `/coleccion` monta una docena de corazones a la vez. Si cada mutador
    // parte del `favoritos` que capturó su último render, dos toggles en el
    // mismo tick calculan ambos desde la misma lista vieja y el segundo pisa
    // al primero. Un solo `act()` reproduce exactamente ese tick.
    const a = renderHook(() => useFavoritos());
    const b = renderHook(() => useFavoritos());

    act(() => {
      a.result.current.toggleFavorito(1);
      b.result.current.toggleFavorito(2);
    });

    expect(a.result.current.favoritos).toEqual([1, 2]);
    expect(b.result.current.favoritos).toEqual([1, 2]);
  });

  it("tampoco pierde la baja si un toggle quita y otro agrega en el mismo tick", () => {
    const a = renderHook(() => useFavoritos());
    const b = renderHook(() => useFavoritos());

    act(() => {
      a.result.current.establecerFavoritos([5]);
    });

    act(() => {
      a.result.current.toggleFavorito(5); // quita el 5
      b.result.current.toggleFavorito(6); // agrega el 6
    });

    expect(a.result.current.favoritos).toEqual([6]);
  });

  it("mantiene sincronizados varios mounts del hook (module-level listeners) sin duplicar llamadas", () => {
    const a = renderHook(() => useFavoritos());
    const b = renderHook(() => useFavoritos());

    act(() => {
      a.result.current.toggleFavorito(3);
    });

    expect(a.result.current.esFavorito(3)).toBe(true);
    expect(b.result.current.esFavorito(3)).toBe(true);
    expect(registrarFavorito).toHaveBeenCalledTimes(1);
    expect(registrarFavorito).toHaveBeenCalledWith(3);
  });
});

describe("useFavoritos — sincronización entre pestañas (evento storage)", () => {
  // Fake de Storage: el global real de este entorno es un objeto vacío sin
  // métodos (ver el comentario del beforeEach de arriba), así que para
  // simular lo que escribió otra pestaña se instala una implementación
  // completa y se restaura al terminar — mismo patrón que useTemaAdmin.test.jsx.
  const localStorageOriginal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  function instalarStorage(valorInicial = null) {
    const estado = { valor: valorInicial };
    const falso = {
      getItem: vi.fn((clave) => (clave === STORAGE_KEY ? estado.valor : null)),
      setItem: vi.fn((clave, valor) => {
        if (clave === STORAGE_KEY) estado.valor = valor;
      }),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(globalThis, "localStorage", {
      value: falso,
      configurable: true,
      writable: true,
    });
    return { estado, falso };
  }

  afterEach(() => {
    if (localStorageOriginal) {
      Object.defineProperty(globalThis, "localStorage", localStorageOriginal);
    } else {
      delete globalThis.localStorage;
    }
    const { result } = renderHook(() => useFavoritos());
    act(() => {
      result.current.establecerFavoritos([]);
    });
  });

  it("refleja lo que escribió otra pestaña y notifica a las instancias montadas", () => {
    const { estado } = instalarStorage(JSON.stringify([]));
    const a = renderHook(() => useFavoritos());
    const b = renderHook(() => useFavoritos());

    act(() => {
      estado.valor = JSON.stringify([7, 9]);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: estado.valor }));
    });

    expect(a.result.current.favoritos).toEqual([7, 9]);
    expect(b.result.current.esFavorito(9)).toBe(true);
  });

  it("NO vuelve a escribir en storage al reaccionar al evento (sin loop)", () => {
    const { estado, falso } = instalarStorage(JSON.stringify([]));
    renderHook(() => useFavoritos());

    falso.setItem.mockClear();
    act(() => {
      estado.valor = JSON.stringify([7]);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: estado.valor }));
    });

    expect(falso.setItem).not.toHaveBeenCalled();
  });

  it("un toggle posterior parte de la lista sincronizada, no de la vieja", () => {
    const { estado } = instalarStorage(JSON.stringify([]));
    const { result } = renderHook(() => useFavoritos());

    act(() => {
      estado.valor = JSON.stringify([7]);
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: estado.valor }));
    });
    act(() => {
      result.current.toggleFavorito(9);
    });

    expect(result.current.favoritos).toEqual([7, 9]);
  });

  it("re-montar tras quedar sin instancias refresca el estado de módulo (el primer toggle no pisa lo de otra pestaña)", () => {
    // Mismo escenario que en useCarrito.test.jsx: sin instancias montadas no
    // hay listener de `storage`, así que lo que otra pestaña escribe en ese
    // lapso nunca actualiza la variable de módulo. Al re-montar, el
    // initializer lee storage fresco (la UI se ve bien) pero el primer
    // toggle partiría del valor viejo y pisaría lo de la otra pestaña.
    const { estado } = instalarStorage(JSON.stringify([]));
    const primera = renderHook(() => useFavoritos());
    act(() => {
      primera.result.current.establecerFavoritos([]);
    });
    primera.unmount();

    // Otra pestaña agrega el 7 mientras acá no hay listener montado.
    estado.valor = JSON.stringify([7]);

    const segunda = renderHook(() => useFavoritos());
    expect(segunda.result.current.favoritos).toEqual([7]);

    act(() => {
      segunda.result.current.toggleFavorito(9);
    });

    // Sin el refresh del estado de módulo, esto daría [9]: el favorito de la
    // otra pestaña pisado en silencio.
    expect(segunda.result.current.favoritos).toEqual([7, 9]);
  });

  it("ignora eventos de otras claves y un valor corrupto cae a lista vacía", () => {
    const { estado } = instalarStorage(JSON.stringify([3]));
    const { result } = renderHook(() => useFavoritos());

    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "otra-clave", newValue: "[9]" }));
    });
    expect(result.current.favoritos).toEqual([3]);

    act(() => {
      estado.valor = "{ roto";
      window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: estado.valor }));
    });
    expect(result.current.favoritos).toEqual([]);
  });
});
