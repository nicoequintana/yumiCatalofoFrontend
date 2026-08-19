import { describe, expect, it, vi, beforeEach } from "vitest";
import { crearOrden, getOrdenes, getOrdenById, actualizarEstadoOrden, getHistorialCliente } from "./ordenes.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockFetchOnce(body = []) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchAutenticadoOnce(body = [], ok = true) {
  fetchAutenticado.mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

describe("crearOrden", () => {
  it("hace POST a /ordenes con el body en JSON", async () => {
    mockFetchOnce({ id: 1 });

    await crearOrden({ dni: "12345678", nombre: "Ana", telefono: "123", items: [{ productId: 1, cantidad: 1 }] });

    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/ordenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dni: "12345678",
        nombre: "Ana",
        telefono: "123",
        items: [{ productId: 1, cantidad: 1 }],
      }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: "El DNI es obligatorio." }),
    });

    await expect(crearOrden({})).rejects.toThrow("El DNI es obligatorio.");
  });
});

describe("getOrdenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 1, pageSize: 20, total: 0 });

    await getOrdenes();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/ordenes`, undefined);
  });

  it("con filtros arma la querystring combinando todos los params", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 2, pageSize: 10, total: 0 });

    await getOrdenes({
      estado: "PENDIENTE",
      desde: "2026-01-01",
      hasta: "2026-01-31",
      dni: "12345678",
      nombre: "Ana",
      page: 2,
      pageSize: 10,
    });

    const url = fetchAutenticado.mock.calls[0][0];
    const [, query] = url.split("?");
    const params = new URLSearchParams(query);

    expect(params.get("estado")).toBe("PENDIENTE");
    expect(params.get("desde")).toBe("2026-01-01");
    expect(params.get("hasta")).toBe("2026-01-31");
    expect(params.get("dni")).toBe("12345678");
    expect(params.get("nombre")).toBe("Ana");
    expect(params.get("page")).toBe("2");
    expect(params.get("pageSize")).toBe("10");
  });

  it("omite filtros no provistos o vacíos", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 1, pageSize: 20, total: 0 });

    await getOrdenes({ estado: "", dni: undefined, nombre: null });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/ordenes`, undefined);
  });

  it("devuelve data/page/pageSize/total tal cual llegan del backend, incluso con data vacío", async () => {
    mockFetchAutenticadoOnce({ data: [], page: 1, pageSize: 20, total: 0 });

    const resultado = await getOrdenes();

    expect(resultado).toEqual({ data: [], page: 1, pageSize: 20, total: 0 });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getOrdenes()).rejects.toThrow("No autorizado.");
  });
});

describe("getOrdenById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hace GET a /ordenes/:id vía fetchAutenticado", async () => {
    const orden = { id: 5, cliente: {}, items: [] };
    mockFetchAutenticadoOnce(orden);

    const resultado = await getOrdenById(5);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/ordenes/5`, undefined);
    expect(resultado).toEqual(orden);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Orden no encontrada." }, false);

    await expect(getOrdenById(999)).rejects.toThrow("Orden no encontrada.");
  });
});

describe("actualizarEstadoOrden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hace PATCH a /ordenes/:id/estado con el nuevo estado en JSON", async () => {
    mockFetchAutenticadoOnce({ id: 5, estado: "CONFIRMADA" });

    await actualizarEstadoOrden(5, "CONFIRMADA");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/ordenes/5/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "CONFIRMADA" }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "estado debe ser uno de: ..." }, false);

    await expect(actualizarEstadoOrden(5, "INVALIDO")).rejects.toThrow("estado debe ser uno de: ...");
  });
});

describe("getHistorialCliente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hace GET a /clientes/:dni/ordenes vía fetchAutenticado", async () => {
    mockFetchAutenticadoOnce([{ id: 1 }, { id: 2 }]);

    const resultado = await getHistorialCliente("12345678");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/clientes/12345678/ordenes`, undefined);
    expect(resultado).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("devuelve array vacío si el cliente no tiene órdenes", async () => {
    mockFetchAutenticadoOnce([]);

    const resultado = await getHistorialCliente("00000000");

    expect(resultado).toEqual([]);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Ocurrió un error al comunicarse con el servidor." }, false);

    await expect(getHistorialCliente("12345678")).rejects.toThrow(
      "Ocurrió un error al comunicarse con el servidor.",
    );
  });
});
