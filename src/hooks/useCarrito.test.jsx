import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import useCarrito from "./useCarrito.js";

describe("useCarrito", () => {
  beforeEach(() => {
    // Same reset strategy as useFavoritos.test.jsx: this environment's
    // `localStorage` global is unreliable (Node's `--localstorage-file`
    // flag shadows jsdom's implementation without a configured path), so
    // state is reset through the hook's own public setter instead of a
    // direct `localStorage.clear()` — `useCarrito.js` already tolerates a
    // broken localStorage internally (see its try/catch), which is exactly
    // what lets this work as a reset mechanism here.
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
  });

  it("agregar sobre producto nuevo crea línea con cantidad 1 por defecto", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1);
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });

  it("agregar con cantidad negativa no reduce ni elimina la línea (guard, trata como 1)", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, -5);
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });

  it("agregar acepta cantidad explícita", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 3);
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 3 }]);
  });

  it("agregar sobre producto existente incrementa cantidad sin duplicar línea", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 2);
    });
    act(() => {
      result.current.agregar(1, 3);
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 5 }]);
  });

  it("quitar elimina la línea completa", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1);
      result.current.agregar(2);
    });
    act(() => {
      result.current.quitar(1);
    });

    expect(result.current.carrito).toEqual([{ productId: 2, cantidad: 1 }]);
  });

  it("actualizarCantidad fija la cantidad de una línea existente", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1);
    });
    act(() => {
      result.current.actualizarCantidad(1, 7);
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 7 }]);
  });

  it("actualizarCantidad con 0 elimina la línea (mismo efecto que quitar)", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 5);
    });
    act(() => {
      result.current.actualizarCantidad(1, 0);
    });

    expect(result.current.carrito).toEqual([]);
  });

  it("vaciar deja el carrito vacío", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1);
      result.current.agregar(2);
    });
    act(() => {
      result.current.vaciar();
    });

    expect(result.current.carrito).toEqual([]);
  });

  it("cantidadTotal suma las cantidades de todas las líneas", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 2);
    });
    act(() => {
      result.current.agregar(2, 5);
    });

    expect(result.current.cantidadTotal).toBe(7);
  });

  // NOTE: a true "persists across mounts via real localStorage" test is not
  // exercisable in this repo's test environment — Node's `--localstorage-file`
  // flag shadows jsdom's localStorage without a configured path, so even a
  // bare `localStorage.setItem` throws here (verified independently, and
  // this is the same known quirk `useFavoritos.test.jsx` works around by
  // never asserting on a fresh read from real storage either). `leerCarrito`'s
  // try/catch means a broken localStorage silently yields `[]` on every
  // mount, so a "late mount picks up prior state" test would fail for
  // environment reasons, not a hook bug. What IS exercisable and is covered
  // below: multiple instances mounted while storage is broken still share
  // state via the module-level listener set, proving the sync mechanism
  // itself doesn't depend on storage succeeding.
  it("mantiene sincronizados varios mounts del hook (module-level listeners)", () => {
    const a = renderHook(() => useCarrito());
    const b = renderHook(() => useCarrito());

    act(() => {
      a.result.current.agregar(1, 2);
    });

    expect(a.result.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
    expect(b.result.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
  });

  it("dos instancias llamando agregar(id, 1) sobre el mismo producto en el mismo tick no pierden cantidad (race del closure)", () => {
    // Both hook instances render once, each capturing `carrito: []` in its
    // own closure. If the mutators read that stale closure instead of the
    // latest module-level state, both calls compute "next" from the same
    // empty array and the second write clobbers the first — ending at
    // cantidad: 1 instead of 2. Both calls happen inside ONE `act()` so
    // neither instance re-renders between them, reproducing the race.
    const a = renderHook(() => useCarrito());
    const b = renderHook(() => useCarrito());

    act(() => {
      a.result.current.agregar(1, 1);
      b.result.current.agregar(1, 1);
    });

    expect(a.result.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
    expect(b.result.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
  });

  it("no explota si localStorage tira error", () => {
    const { result } = renderHook(() => useCarrito());

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new Error("QuotaExceededError");
    };

    expect(() => {
      act(() => {
        result.current.agregar(1);
      });
    }).not.toThrow();

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);

    Storage.prototype.setItem = originalSetItem;
  });
});
