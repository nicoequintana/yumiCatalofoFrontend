import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getConfiguracionHomeMock = vi.fn();

vi.mock("../api/config.js", () => ({
  getConfiguracionHome: (...args) => getConfiguracionHomeMock(...args),
}));

const { default: useProductoIcono } = await import("./useProductoIcono.js");

const ICONO = { id: 7, nombre: "Masajeador", fraseComercial: "Alivio", stock: 5, fotos: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useProductoIcono", () => {
  it("arranca sin resolver mientras el fetch está en vuelo", () => {
    getConfiguracionHomeMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProductoIcono());

    expect(result.current).toEqual({ producto: null, resuelto: false });
  });

  it("resuelve con producto null cuando nadie lo eligió", async () => {
    getConfiguracionHomeMock.mockResolvedValue({ productoIcono: null });

    const { result } = renderHook(() => useProductoIcono());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.producto).toBeNull();
  });

  it("resuelve con el producto cuando está publicado", async () => {
    getConfiguracionHomeMock.mockResolvedValue({ productoIcono: ICONO });

    const { result } = renderHook(() => useProductoIcono());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.producto).toEqual(ICONO);
    expect(getConfiguracionHomeMock).toHaveBeenCalledTimes(1);
  });

  it("resuelve IGUAL cuando el fetch falla, con producto null", async () => {
    getConfiguracionHomeMock.mockRejectedValue(new Error("red caída"));

    const { result } = renderHook(() => useProductoIcono());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.producto).toBeNull();
  });
});
