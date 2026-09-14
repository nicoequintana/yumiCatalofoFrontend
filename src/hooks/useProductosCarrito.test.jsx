import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useProductosCarrito, { reiniciarProductosCarrito } from "./useProductosCarrito.js";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

const P1 = { id: 1, nombre: "Reloj", precio: "1500", stock: 4 };
const P2 = { id: 2, nombre: "Anillo", precio: "500", stock: 1 };

function nuncaContesta() {
  return new Promise(() => {});
}

/** Monta con `clave`, espera la carga en vivo y desmonta: deja el cache sembrado. */
async function sembrarCache(clave, productos) {
  productsApi.getProductsByIds.mockResolvedValueOnce(productos);
  const { result, unmount } = renderHook(() => useProductosCarrito(clave));
  await waitFor(() => expect(result.current.cargando).toBe(false));
  unmount();
}

describe("useProductosCarrito", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reiniciarProductosCarrito();
  });

  it("sin cache arranca cargando y entrega los productos en vivo", async () => {
    productsApi.getProductsByIds.mockResolvedValue([P1]);

    const { result } = renderHook(() => useProductosCarrito("1"));

    expect(result.current).toEqual({ productos: [], cargando: true, error: false });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current).toEqual({ productos: [P1], cargando: false, error: false });
    expect(productsApi.getProductsByIds).toHaveBeenCalledWith([1]);
  });

  it("con cache para esos ids no carga, y SIEMPRE refetchea en segundo plano", async () => {
    await sembrarCache("1,2", [P1, P2]);
    productsApi.getProductsByIds.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => useProductosCarrito("1,2"));

    expect(result.current).toEqual({ productos: [P1, P2], cargando: false, error: false });
    expect(productsApi.getProductsByIds).toHaveBeenCalledTimes(2);
    expect(productsApi.getProductsByIds).toHaveBeenLastCalledWith([1, 2]);
  });

  it("el refetch reemplaza el cache con el dato vivo (precio y stock)", async () => {
    await sembrarCache("1", [P1]);
    const vivo = { ...P1, precio: "1800", stock: 0 };
    let resolver;
    productsApi.getProductsByIds.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );

    const { result } = renderHook(() => useProductosCarrito("1"));
    expect(result.current.productos).toEqual([P1]);

    await act(async () => {
      resolver([vivo]);
    });
    expect(result.current.productos).toEqual([vivo]);
  });

  it("un id quitado no queda colgado: el cache se filtra a los ids vigentes", async () => {
    await sembrarCache("1,2", [P1, P2]);
    productsApi.getProductsByIds.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => useProductosCarrito("1"));

    expect(result.current).toEqual({ productos: [P1], cargando: false, error: false });
  });

  it("un id nuevo sin cache vuelve a cargar: no se dibuja como 'no disponible'", async () => {
    await sembrarCache("1", [P1]);
    productsApi.getProductsByIds.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => useProductosCarrito("1,2"));

    expect(result.current).toEqual({ productos: [], cargando: true, error: false });
    expect(productsApi.getProductsByIds).toHaveBeenLastCalledWith([1, 2]);
  });

  it("un producto que el fetch vivo ya no trajo sigue ausente con el cache (no se inventa)", async () => {
    await sembrarCache("1,99", [P1]);
    productsApi.getProductsByIds.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => useProductosCarrito("1,99"));

    expect(result.current).toEqual({ productos: [P1], cargando: false, error: false });
  });

  it("si el fetch falla devuelve error, distinto de 'no hay nada'", async () => {
    productsApi.getProductsByIds.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useProductosCarrito("1"));

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current).toEqual({ productos: [], cargando: false, error: true });
  });

  it("si el refetch falla con cache, gana el error: no se confían precios sin verificar", async () => {
    await sembrarCache("1", [P1]);
    productsApi.getProductsByIds.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useProductosCarrito("1"));

    expect(result.current.productos).toEqual([P1]);
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current).toEqual({ productos: [], cargando: false, error: true });
  });

  it("una respuesta vieja que llega tarde no pisa el cache de la más nueva", async () => {
    let resolverViejo;
    productsApi.getProductsByIds
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolverViejo = resolve;
        }),
      )
      .mockResolvedValueOnce([P1]);

    const { result, rerender, unmount } = renderHook(({ clave }) => useProductosCarrito(clave), {
      initialProps: { clave: "1,2" },
    });
    rerender({ clave: "1" });
    await waitFor(() => expect(result.current.cargando).toBe(false));
    await act(async () => {
      resolverViejo([{ ...P1, precio: "999" }, P2]);
    });
    unmount();

    productsApi.getProductsByIds.mockReturnValue(nuncaContesta());
    const segundo = renderHook(() => useProductosCarrito("1"));
    expect(segundo.result.current.productos).toEqual([P1]);
  });

  it("reiniciarProductosCarrito vacía el cache", async () => {
    await sembrarCache("1", [P1]);
    reiniciarProductosCarrito();
    productsApi.getProductsByIds.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => useProductosCarrito("1"));

    expect(result.current.cargando).toBe(true);
  });
});
