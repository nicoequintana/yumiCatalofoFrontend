import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductsMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProducts: (...args) => getProductsMock(...args),
}));

const { default: useNuevosIngresos } = await import("./useNuevosIngresos.js");

const PRODUCTO = { id: 1, nombre: "Reloj Clásico", precio: "1000", fotos: [], esNuevo: true };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useNuevosIngresos", () => {
  it("pide los últimos publicados: orden recientes, 8", async () => {
    getProductsMock.mockResolvedValue({ data: [PRODUCTO], page: 1, pageSize: 8, total: 1 });

    const { result } = renderHook(() => useNuevosIngresos());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(getProductsMock).toHaveBeenCalledWith({ orden: "recientes", pageSize: 8 });
    expect(getProductsMock).toHaveBeenCalledTimes(1);
    expect(result.current.productos).toEqual([PRODUCTO]);
  });

  it("arranca sin resolver mientras el fetch está en vuelo", () => {
    getProductsMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNuevosIngresos());

    expect(result.current).toEqual({ productos: [], resuelto: false });
  });

  // Falla blando, como useDestacados: sin la sección no se afirma nada falso
  // sobre el catálogo (ver docs/reglas/catalogo-publico.md).
  it("resuelve IGUAL cuando el fetch falla, con lista vacía", async () => {
    getProductsMock.mockRejectedValue(new Error("red caída"));

    const { result } = renderHook(() => useNuevosIngresos());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.productos).toEqual([]);
  });
});
