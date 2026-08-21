import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useTemaAdmin, { STORAGE_KEY, aplicarTemaGuardado, limpiarTema } from "./useTemaAdmin.js";

// In this environment `globalThis.localStorage` is a plain empty object with
// no Storage methods at all (Node's `--localstorage-file` flag shadows
// jsdom's implementation without a configured path), so it can be neither
// used nor spied on — `vi.spyOn` fails with "property is not defined".
// Tests therefore install a full fake Storage on the global (the property is
// configurable) and restore the original afterwards. The same environment
// quirk is documented in `useFavoritos.test.jsx`.
const localStorageOriginal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function instalarStorage({ valorGuardado = null, fallaLectura = false, fallaEscritura = false } = {}) {
  const escrituras = [];
  const falso = {
    getItem: vi.fn((clave) => {
      if (fallaLectura) throw new Error("storage disabled");
      return clave === STORAGE_KEY ? valorGuardado : null;
    }),
    setItem: vi.fn((clave, valor) => {
      if (fallaEscritura) throw new Error("quota exceeded");
      escrituras.push([clave, valor]);
    }),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: falso,
    configurable: true,
    writable: true,
  });
  return escrituras;
}

function restaurarStorage() {
  if (localStorageOriginal) {
    Object.defineProperty(globalThis, "localStorage", localStorageOriginal);
  } else {
    delete globalThis.localStorage;
  }
}

function temaEnDom() {
  return document.documentElement.dataset.temaAdmin;
}

describe("useTemaAdmin", () => {
  beforeEach(() => {
    limpiarTema();
  });

  afterEach(() => {
    limpiarTema();
    restaurarStorage();
    vi.restoreAllMocks();
  });

  it("arranca en claro cuando no hay preferencia guardada", () => {
    instalarStorage();

    const { result } = renderHook(() => useTemaAdmin());

    expect(result.current.tema).toBe("claro");
    expect(result.current.esOscuro).toBe(false);
  });

  it("lee la preferencia guardada al montar", () => {
    instalarStorage({ valorGuardado: "oscuro" });

    const { result } = renderHook(() => useTemaAdmin());

    expect(result.current.tema).toBe("oscuro");
    expect(result.current.esOscuro).toBe(true);
  });

  it("ignora un valor invalido guardado y cae a claro", () => {
    instalarStorage({ valorGuardado: "fucsia" });

    const { result } = renderHook(() => useTemaAdmin());

    expect(result.current.tema).toBe("claro");
  });

  it("cae a claro si leer localStorage lanza", () => {
    instalarStorage({ fallaLectura: true });

    const { result } = renderHook(() => useTemaAdmin());

    expect(result.current.tema).toBe("claro");
  });

  it("marca data-tema-admin en el html solo en oscuro", () => {
    instalarStorage();
    const { result } = renderHook(() => useTemaAdmin());

    expect(temaEnDom()).toBeUndefined();

    act(() => {
      result.current.alternarTema();
    });
    expect(temaEnDom()).toBe("oscuro");

    act(() => {
      result.current.alternarTema();
    });
    expect(temaEnDom()).toBeUndefined();
  });

  it("persiste el tema elegido en localStorage", () => {
    const escrituras = instalarStorage();
    const { result } = renderHook(() => useTemaAdmin());

    act(() => {
      result.current.alternarTema();
    });
    expect(escrituras.at(-1)).toEqual([STORAGE_KEY, "oscuro"]);

    act(() => {
      result.current.alternarTema();
    });
    expect(escrituras.at(-1)).toEqual([STORAGE_KEY, "claro"]);
  });

  it("sincroniza todas las instancias montadas del hook", () => {
    instalarStorage();
    const primera = renderHook(() => useTemaAdmin());
    const segunda = renderHook(() => useTemaAdmin());

    act(() => {
      primera.result.current.alternarTema();
    });

    expect(segunda.result.current.tema).toBe("oscuro");
  });

  it("mantiene el tema en memoria aunque localStorage falle al escribir", () => {
    instalarStorage({ fallaEscritura: true });

    const { result } = renderHook(() => useTemaAdmin());

    act(() => {
      result.current.alternarTema();
    });

    expect(result.current.tema).toBe("oscuro");
    expect(temaEnDom()).toBe("oscuro");
  });

  it("limpia el atributo del html al desmontar la ultima instancia", () => {
    instalarStorage();
    const { result, unmount } = renderHook(() => useTemaAdmin());

    act(() => {
      result.current.alternarTema();
    });
    expect(temaEnDom()).toBe("oscuro");

    unmount();

    expect(temaEnDom()).toBeUndefined();
  });

  it("no limpia el atributo mientras siga montada otra instancia", () => {
    instalarStorage();
    const primera = renderHook(() => useTemaAdmin());
    const segunda = renderHook(() => useTemaAdmin());

    act(() => {
      primera.result.current.alternarTema();
    });

    primera.unmount();
    expect(temaEnDom()).toBe("oscuro");

    segunda.unmount();
    expect(temaEnDom()).toBeUndefined();
  });
});

describe("aplicarTemaGuardado", () => {
  beforeEach(() => {
    limpiarTema();
  });

  afterEach(() => {
    limpiarTema();
    restaurarStorage();
    vi.restoreAllMocks();
  });

  it("aplica el tema oscuro guardado sin montar el hook", () => {
    instalarStorage({ valorGuardado: "oscuro" });

    aplicarTemaGuardado();

    expect(temaEnDom()).toBe("oscuro");
  });

  it("no marca nada cuando la preferencia guardada es clara", () => {
    instalarStorage({ valorGuardado: "claro" });

    aplicarTemaGuardado();

    expect(temaEnDom()).toBeUndefined();
  });
});
