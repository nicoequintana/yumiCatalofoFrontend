import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import usePedidosCliente, { reiniciarPedidosCliente } from "./usePedidosCliente.js";
import * as cuentaApi from "../api/cuenta.js";

vi.mock("../api/cuenta.js");

const PEDIDO_1 = {
  id: 1,
  estado: "ENTREGADA",
  estadoEtiqueta: "Entregada",
  createdAt: "2026-09-01T12:00:00.000Z",
  total: "1500",
};

function nuncaContesta() {
  return new Promise(() => {});
}

/** Monta, espera la carga en vivo y desmonta: deja el cache sembrado. */
async function sembrarCache(pedidos) {
  cuentaApi.getPedidos.mockResolvedValueOnce({ data: pedidos });
  const { result, unmount } = renderHook(() => usePedidosCliente());
  await waitFor(() => expect(result.current.cargando).toBe(false));
  unmount();
}

describe("usePedidosCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reiniciarPedidosCliente();
  });

  it("sin cache arranca cargando y entrega los pedidos en vivo", async () => {
    cuentaApi.getPedidos.mockResolvedValue({ data: [PEDIDO_1] });

    const { result } = renderHook(() => usePedidosCliente());

    expect(result.current.cargando).toBe(true);
    expect(result.current.pedidos).toBe(null);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pedidos).toEqual([PEDIDO_1]);
    expect(result.current.error).toBe(false);
  });

  it("con cache no muestra 'cargando' al remontar, y refetchea en segundo plano", async () => {
    await sembrarCache([PEDIDO_1]);
    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => usePedidosCliente());

    expect(result.current.cargando).toBe(false);
    expect(result.current.pedidos).toEqual([PEDIDO_1]);
    // Una vez en `sembrarCache` y otra al remontar: el refetch en segundo
    // plano es SIEMPRE, aunque haya cache que mostrar mientras tanto.
    expect(cuentaApi.getPedidos).toHaveBeenCalledTimes(2);
  });

  it("si el fetch falla sin cache, devuelve error", async () => {
    cuentaApi.getPedidos.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => usePedidosCliente());

    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.error).toBe(true);
    expect(result.current.pedidos).toBe(null);
  });

  it("reiniciarPedidosCliente vacía el cache", async () => {
    await sembrarCache([PEDIDO_1]);
    reiniciarPedidosCliente();
    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => usePedidosCliente());

    expect(result.current.cargando).toBe(true);
    expect(result.current.pedidos).toBe(null);
  });

  it("recargar dispara un nuevo fetch", async () => {
    cuentaApi.getPedidos
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [PEDIDO_1] });

    const { result } = renderHook(() => usePedidosCliente());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pedidos).toEqual([]);

    act(() => {
      result.current.recargar();
    });

    await waitFor(() => expect(result.current.pedidos).toEqual([PEDIDO_1]));
    expect(cuentaApi.getPedidos).toHaveBeenCalledTimes(2);
  });
});
