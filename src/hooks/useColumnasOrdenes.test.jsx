import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../api/ordenes.js", () => ({ getOrdenes: vi.fn() }));

const { getOrdenes } = await import("../api/ordenes.js");
const { default: useColumnasOrdenes, ORDENES_POR_COLUMNA } = await import("./useColumnasOrdenes.js");

const ESTADOS = [
  { valor: "PENDIENTE", etiqueta: "Pendiente", terminal: false },
  { valor: "EN_PREPARACION", etiqueta: "En preparación", terminal: false },
  { valor: "ENTREGADA", etiqueta: "Entregada", terminal: true },
  { valor: "CANCELADA", etiqueta: "Cancelada", terminal: true },
];

function orden(id, estado, extra = {}) {
  return {
    id,
    estado,
    estadoEtiqueta: ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado,
    cliente: { nombre: `Cliente ${id}`, dni: "12345678", email: "a@b.com" },
    total: "1000",
    cantidadItems: 1,
    resumen: [{ nombreProducto: "Termo", cantidad: 1 }],
    createdAt: "2026-09-01T12:00:00.000Z",
    ...extra,
  };
}

/** Responde cada columna con lo que le corresponda, según el estado pedido. */
function responderPorEstado(porEstado) {
  getOrdenes.mockImplementation(({ estado }) => {
    const respuesta = porEstado[estado];
    if (respuesta instanceof Error) return Promise.reject(respuesta);
    return Promise.resolve(respuesta ?? { data: [], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 0 });
  });
}

beforeEach(() => {
  getOrdenes.mockReset();
  responderPorEstado({});
});

describe("useColumnasOrdenes — carga inicial", () => {
  it("pide una vez por estado, en paralelo", async () => {
    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(getOrdenes).toHaveBeenCalledTimes(4);
    for (const { valor } of ESTADOS) {
      expect(getOrdenes).toHaveBeenCalledWith(
        expect.objectContaining({ estado: valor, page: 1, pageSize: ORDENES_POR_COLUMNA }),
      );
    }
  });

  it("el contador de cada columna sale del total del servidor, no del largo de la página", async () => {
    responderPorEstado({
      ENTREGADA: { data: [orden(1, "ENTREGADA")], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 140 },
    });

    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.columnas.ENTREGADA.ordenes).toHaveLength(1);
    expect(result.current.columnas.ENTREGADA.total).toBe(140);
  });

  it("una columna que falla NO se lleva puestas a las otras tres", async () => {
    // Es la razón entera de usar `Promise.allSettled`: con `Promise.all`, un
    // solo rechazo blanquea el tablero completo y el admin se queda sin
    // pantalla en vez de con tres columnas usables.
    responderPorEstado({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 1 },
      ENTREGADA: new Error("500 del servidor"),
    });

    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.columnas.ENTREGADA.error).toBe("500 del servidor");
    expect(result.current.columnas.PENDIENTE.error).toBeNull();
    expect(result.current.columnas.PENDIENTE.ordenes).toHaveLength(1);
  });

  it("propaga los filtros a las cuatro columnas", async () => {
    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, { dni: "12345678" }));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    for (const llamada of getOrdenes.mock.calls) {
      expect(llamada[0].dni).toBe("12345678");
    }
  });
});

describe("useColumnasOrdenes — cargar más", () => {
  it("pide la página siguiente de ESA columna y la agrega al final", async () => {
    responderPorEstado({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 2 },
    });

    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    getOrdenes.mockResolvedValueOnce({
      data: [orden(2, "PENDIENTE")],
      page: 2,
      pageSize: ORDENES_POR_COLUMNA,
      total: 2,
    });
    await act(async () => {
      await result.current.cargarMas("PENDIENTE");
    });

    expect(getOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ estado: "PENDIENTE", page: 2 }));
    expect(result.current.columnas.PENDIENTE.ordenes.map((o) => o.id)).toEqual([1, 2]);
    expect(result.current.columnas.EN_PREPARACION.ordenes).toHaveLength(0);
  });

  it("deduplica por id: el catálogo pudo moverse entre tandas", async () => {
    responderPorEstado({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 2 },
    });

    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    getOrdenes.mockResolvedValueOnce({
      data: [orden(1, "PENDIENTE"), orden(2, "PENDIENTE")],
      page: 2,
      pageSize: ORDENES_POR_COLUMNA,
      total: 2,
    });
    await act(async () => {
      await result.current.cargarMas("PENDIENTE");
    });

    expect(result.current.columnas.PENDIENTE.ordenes.map((o) => o.id)).toEqual([1, 2]);
  });

  it("un error al cargar más NO vacía lo que ya se había cargado", async () => {
    responderPorEstado({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 2 },
    });

    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    getOrdenes.mockRejectedValueOnce(new Error("se cayó la red"));
    await act(async () => {
      await result.current.cargarMas("PENDIENTE");
    });

    expect(result.current.columnas.PENDIENTE.ordenes).toHaveLength(1);
    expect(result.current.columnas.PENDIENTE.errorPagina).toBe("se cayó la red");
  });
});

describe("useColumnasOrdenes — mover una orden entre columnas", () => {
  beforeEach(() => {
    responderPorEstado({
      PENDIENTE: {
        data: [orden(1, "PENDIENTE"), orden(2, "PENDIENTE")],
        page: 1,
        pageSize: ORDENES_POR_COLUMNA,
        total: 2,
      },
      EN_PREPARACION: { data: [], page: 1, pageSize: ORDENES_POR_COLUMNA, total: 0 },
    });
  });

  it("la saca del origen, la pone en el destino y ajusta LOS DOS contadores", async () => {
    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.moverOrden({
        ordenId: 1,
        origen: "PENDIENTE",
        destino: "EN_PREPARACION",
        respuesta: {
          estado: "EN_PREPARACION",
          estadoEtiqueta: "En preparación",
          updatedAt: "2026-09-02T10:00:00.000Z",
        },
      });
    });

    expect(result.current.columnas.PENDIENTE.ordenes.map((o) => o.id)).toEqual([2]);
    expect(result.current.columnas.PENDIENTE.total).toBe(1);
    expect(result.current.columnas.EN_PREPARACION.ordenes.map((o) => o.id)).toEqual([1]);
    expect(result.current.columnas.EN_PREPARACION.total).toBe(1);
  });

  it("CONSERVA el monto y el resumen que la respuesta del PATCH no trae", async () => {
    // El PATCH responde con la forma DETALLE: trae `items`, pero no `total`,
    // `resumen` ni `cantidadItems`. Pisar la tarjeta con esa respuesta le
    // arrancaría el monto y el hover, sin ningún error. Y no hace falta: el
    // monto de una orden no cambia porque cambie su estado.
    const { result } = renderHook(() => useColumnasOrdenes(ESTADOS, {}));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => {
      result.current.moverOrden({
        ordenId: 1,
        origen: "PENDIENTE",
        destino: "EN_PREPARACION",
        respuesta: {
          id: 1,
          estado: "EN_PREPARACION",
          estadoEtiqueta: "En preparación",
          items: [{ id: 9, nombreProducto: "Termo", precioUnitario: "1000", cantidad: 1 }],
        },
      });
    });

    const movida = result.current.columnas.EN_PREPARACION.ordenes[0];
    expect(movida.total).toBe("1000");
    expect(movida.cantidadItems).toBe(1);
    expect(movida.resumen).toEqual([{ nombreProducto: "Termo", cantidad: 1 }]);
    expect(movida.estado).toBe("EN_PREPARACION");
    expect(movida.estadoEtiqueta).toBe("En preparación");
    // Las líneas completas no tienen por qué entrar en una tarjeta de tablero.
    expect(movida.items).toBeUndefined();
  });
});
