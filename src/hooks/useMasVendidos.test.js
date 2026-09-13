import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENSAJE_ERROR_CARGA } from "./useOfertas.js";

const getProductosMasVendidosMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProductosMasVendidos: (...args) => getProductosMasVendidosMock(...args),
}));

const { default: useMasVendidos, MIN_MAS_VENDIDOS } = await import("./useMasVendidos.js");

const PRODUCTO = { id: 1, nombre: "Reloj Clásico", precio: "1000", fotos: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useMasVendidos", () => {
  it("exporta el umbral de la sección: 4", () => {
    expect(MIN_MAS_VENDIDOS).toBe(4);
  });

  it("arranca sin resolver mientras el fetch está en vuelo", () => {
    getProductosMasVendidosMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMasVendidos());

    expect(result.current).toEqual({ productos: [], error: null, resuelto: false });
  });

  it("resuelve con los más vendidos del backend", async () => {
    getProductosMasVendidosMock.mockResolvedValue({ data: [PRODUCTO] });

    const { result } = renderHook(() => useMasVendidos());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.productos).toEqual([PRODUCTO]);
    expect(result.current.error).toBeNull();
    expect(getProductosMasVendidosMock).toHaveBeenCalledTimes(1);
  });

  // "No hay más vendidos" y "el backend no contestó" son dos estados distintos.
  it("distingue falló la carga de no hay más vendidos, y resuelve IGUAL", async () => {
    getProductosMasVendidosMock.mockRejectedValue(new Error("red caída"));

    const { result } = renderHook(() => useMasVendidos());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.error).toBe(MENSAJE_ERROR_CARGA);
    expect(result.current.productos).toEqual([]);
  });
});
