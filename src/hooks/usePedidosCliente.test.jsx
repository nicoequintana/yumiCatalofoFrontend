import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import usePedidosCliente, {
  precargarPedidosCliente,
  reiniciarPedidosCliente,
  usePedidoCliente,
} from "./usePedidosCliente.js";
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

describe("precargarPedidosCliente (desde MiCuenta)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reiniciarPedidosCliente();
  });

  it("siembra el cache: el PRIMER montaje de Mis pedidos ya no arranca cargando", async () => {
    cuentaApi.getPedidos.mockResolvedValueOnce({ data: [PEDIDO_1] });
    await precargarPedidosCliente();
    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => usePedidosCliente());

    expect(result.current.cargando).toBe(false);
    expect(result.current.pedidos).toEqual([PEDIDO_1]);
  });

  it("nunca rechaza: un fallo solo deja el cache como estaba", async () => {
    cuentaApi.getPedidos.mockRejectedValueOnce(new Error("network down"));
    await expect(precargarPedidosCliente()).resolves.toBeUndefined();

    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());
    const { result } = renderHook(() => usePedidosCliente());
    expect(result.current.cargando).toBe(true);
  });

  it("una respuesta que llega DESPUÉS de un cambio de sesión no siembra el cache", async () => {
    let contestar;
    cuentaApi.getPedidos.mockReturnValueOnce(new Promise((r) => { contestar = r; }));
    const enVuelo = precargarPedidosCliente();
    reiniciarPedidosCliente();
    contestar({ data: [PEDIDO_1] });
    await enVuelo;

    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());
    const { result } = renderHook(() => usePedidosCliente());
    expect(result.current.cargando).toBe(true);
    expect(result.current.pedidos).toBe(null);
  });
});

const DETALLE_1 = {
  ...PEDIDO_1,
  notas: null,
  updatedAt: "2026-09-02T12:00:00.000Z",
  items: [{ nombreProducto: "Reloj Clásico", cantidad: 1, precioUnitario: "1500", fotoPortada: null }],
};

describe("usePedidoCliente (detalle)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reiniciarPedidosCliente();
  });

  it("sin nada conocido arranca cargando y entrega el detalle en vivo", async () => {
    cuentaApi.getPedidoPorId.mockResolvedValue(DETALLE_1);

    const { result } = renderHook(() => usePedidoCliente("1"));

    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.pedido).toEqual(DETALLE_1);
    expect(cuentaApi.getPedidoPorId).toHaveBeenCalledWith("1");
  });

  it("con el detalle ya visto, remonta sin 'cargando' y refetchea en segundo plano", async () => {
    cuentaApi.getPedidoPorId.mockResolvedValueOnce(DETALLE_1);
    const primero = renderHook(() => usePedidoCliente("1"));
    await waitFor(() => expect(primero.result.current.cargando).toBe(false));
    primero.unmount();
    cuentaApi.getPedidoPorId.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => usePedidoCliente("1"));

    expect(result.current.cargando).toBe(false);
    expect(result.current.pedido).toEqual(DETALLE_1);
    expect(cuentaApi.getPedidoPorId).toHaveBeenCalledTimes(2);
  });

  it("sin detalle pero con el listado cacheado, arranca con el resumen del listado (sin items)", async () => {
    await sembrarCache([PEDIDO_1]);
    cuentaApi.getPedidoPorId.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => usePedidoCliente("1"));

    expect(result.current.cargando).toBe(false);
    expect(result.current.pedido).toEqual(PEDIDO_1);
    expect(result.current.pedido.items).toBeUndefined();
  });

  it("un 404 gana aunque haya resumen: 'no existe' no se tapa con datos viejos", async () => {
    await sembrarCache([PEDIDO_1]);
    cuentaApi.getPedidoPorId.mockRejectedValue(Object.assign(new Error("no"), { status: 404 }));

    const { result } = renderHook(() => usePedidoCliente("1"));

    await waitFor(() => expect(result.current.noEncontrado).toBe(true));
    expect(result.current.error).toBe(false);
  });

  it("reiniciarPedidosCliente vacía también los detalles", async () => {
    cuentaApi.getPedidoPorId.mockResolvedValueOnce(DETALLE_1);
    const primero = renderHook(() => usePedidoCliente("1"));
    await waitFor(() => expect(primero.result.current.cargando).toBe(false));
    primero.unmount();
    reiniciarPedidosCliente();
    cuentaApi.getPedidoPorId.mockReturnValue(nuncaContesta());

    const { result } = renderHook(() => usePedidoCliente("1"));

    expect(result.current.cargando).toBe(true);
    expect(result.current.pedido).toBe(null);
  });
});
