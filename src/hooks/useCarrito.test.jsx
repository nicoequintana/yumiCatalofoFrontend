import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useCarrito, { STORAGE_KEY } from "./useCarrito.js";

// Fake de Storage para los tests que necesitan un localStorage FUNCIONAL
// (lectura inicial con basura, evento `storage` de otra pestaña). El global
// real de este entorno es un objeto vacío sin métodos — ver el comentario
// del beforeEach de abajo y `useTemaAdmin.test.jsx`.
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

function restaurarStorage() {
  if (localStorageOriginal) {
    Object.defineProperty(globalThis, "localStorage", localStorageOriginal);
  } else {
    delete globalThis.localStorage;
  }
}

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

  it("agregar con cantidad NaN no produce una línea NaN (guard, trata como 1)", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, Number("abc"));
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
    expect(result.current.cantidadTotal).toBe(1);
  });

  it("agregar con cantidad fraccionaria cae al default de 1 (solo enteros positivos)", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 2.5);
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });

  it("actualizarCantidad ignora una cantidad que no es un entero (NaN incluido)", () => {
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 3);
    });
    act(() => {
      result.current.actualizarCantidad(1, Number("abc"));
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 3 }]);
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

describe("useCarrito — validación de forma por línea al leer", () => {
  afterEach(() => {
    restaurarStorage();
    // Deja el estado de módulo limpio para las suites que siguen.
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
  });

  it("filtra las líneas corruptas y cantidadTotal nunca es NaN", () => {
    instalarStorage(
      JSON.stringify([
        { productId: 1, cantidad: 2 },
        { productId: 2, cantidad: null },
        { productId: 3, cantidad: "abc" },
        { cantidad: 1 },
        { productId: 4, cantidad: 0 },
        { productId: 5, cantidad: -3 },
        { productId: 6, cantidad: 2.5 },
        "basura",
        null,
      ]),
    );

    const { result } = renderHook(() => useCarrito());

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
    expect(result.current.cantidadTotal).toBe(2);
  });

  it("descarta ids inválidos (no enteros positivos)", () => {
    instalarStorage(
      JSON.stringify([
        { productId: "7", cantidad: 1 },
        { productId: -1, cantidad: 1 },
        { productId: 1.5, cantidad: 1 },
        { productId: 8, cantidad: 1 },
      ]),
    );

    const { result } = renderHook(() => useCarrito());

    expect(result.current.carrito).toEqual([{ productId: 8, cantidad: 1 }]);
  });
});

describe("useCarrito — sincronización entre pestañas (evento storage)", () => {
  afterEach(() => {
    restaurarStorage();
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
  });

  function dispararStorage(newValue, key = STORAGE_KEY) {
    window.dispatchEvent(new StorageEvent("storage", { key, newValue }));
  }

  it("refleja lo que escribió otra pestaña y notifica a todas las instancias", () => {
    const { estado } = instalarStorage(JSON.stringify([]));
    const a = renderHook(() => useCarrito());
    const b = renderHook(() => useCarrito());

    act(() => {
      // Otra pestaña ya persistió el valor nuevo; esta solo recibe el evento.
      estado.valor = JSON.stringify([{ productId: 9, cantidad: 3 }]);
      dispararStorage(estado.valor);
    });

    expect(a.result.current.carrito).toEqual([{ productId: 9, cantidad: 3 }]);
    expect(b.result.current.carrito).toEqual([{ productId: 9, cantidad: 3 }]);
  });

  it("NO vuelve a escribir en storage al reaccionar al evento (sin loop)", () => {
    const { estado, falso } = instalarStorage(JSON.stringify([]));
    renderHook(() => useCarrito());

    falso.setItem.mockClear();
    act(() => {
      estado.valor = JSON.stringify([{ productId: 9, cantidad: 3 }]);
      dispararStorage(estado.valor);
    });

    expect(falso.setItem).not.toHaveBeenCalled();
  });

  it("las mutaciones posteriores parten del valor sincronizado, no del viejo", () => {
    const { estado } = instalarStorage(JSON.stringify([]));
    const { result } = renderHook(() => useCarrito());

    act(() => {
      estado.valor = JSON.stringify([{ productId: 9, cantidad: 3 }]);
      dispararStorage(estado.valor);
    });
    act(() => {
      result.current.agregar(9, 1);
    });

    expect(result.current.carrito).toEqual([{ productId: 9, cantidad: 4 }]);
  });

  it("ignora eventos de otras claves", () => {
    const { estado } = instalarStorage(JSON.stringify([{ productId: 1, cantidad: 1 }]));
    const { result } = renderHook(() => useCarrito());

    act(() => {
      dispararStorage(JSON.stringify(["x"]), "otra-clave");
    });

    expect(result.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
    expect(estado.valor).toBe(JSON.stringify([{ productId: 1, cantidad: 1 }]));
  });

  it("un valor corrupto en el evento cae a carrito vacío, igual que en la lectura inicial", () => {
    const { estado } = instalarStorage(JSON.stringify([{ productId: 1, cantidad: 1 }]));
    const { result } = renderHook(() => useCarrito());

    act(() => {
      estado.valor = "{ esto no es json";
      dispararStorage(estado.valor);
    });

    expect(result.current.carrito).toEqual([]);
  });

  it("re-montar tras quedar sin instancias refresca el estado de módulo (la primera mutación no pisa lo de otra pestaña)", () => {
    // Escenario: esta pestaña navega a una vista SIN instancias de useCarrito
    // (p. ej. el panel admin, sin Navbar) — la última instancia desmonta y el
    // listener de `storage` se quita. Otra pestaña agrega al carrito: acá
    // nadie recibe el evento. Al volver al catálogo, el initializer del
    // estado lee storage fresco (la UI se ve bien), pero si la variable de
    // módulo quedó con el valor viejo, la PRIMERA mutación parte de ahí y
    // pisa lo que escribió la otra pestaña.
    const { estado } = instalarStorage(JSON.stringify([]));
    const primera = renderHook(() => useCarrito());
    act(() => {
      primera.result.current.vaciar();
    });
    primera.unmount();

    // Otra pestaña persiste su carrito mientras acá no hay listener montado:
    // no se despacha StorageEvent a propósito — nadie lo escucharía.
    estado.valor = JSON.stringify([{ productId: 9, cantidad: 3 }]);

    const segunda = renderHook(() => useCarrito());
    // El initializer ya lee fresco: la UI muestra lo de la otra pestaña.
    expect(segunda.result.current.carrito).toEqual([{ productId: 9, cantidad: 3 }]);

    act(() => {
      segunda.result.current.agregar(1, 1);
    });

    // Sin el refresh del estado de módulo, esto daría [{ productId: 1,
    // cantidad: 1 }]: la línea de la otra pestaña pisada en silencio.
    expect(segunda.result.current.carrito).toEqual([
      { productId: 9, cantidad: 3 },
      { productId: 1, cantidad: 1 },
    ]);
  });

  it("deja de escuchar el evento cuando se desmonta la última instancia", () => {
    const { estado } = instalarStorage(JSON.stringify([]));
    const { result, unmount } = renderHook(() => useCarrito());

    unmount();

    act(() => {
      estado.valor = JSON.stringify([{ productId: 9, cantidad: 3 }]);
      dispararStorage(estado.valor);
    });

    // Sin instancias montadas no hay a quién notificar; el estado del último
    // render queda como estaba (el próximo mount relee storage igual).
    expect(result.current.carrito).toEqual([]);
  });
});
