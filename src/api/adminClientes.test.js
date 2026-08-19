import { describe, expect, it, vi, beforeEach } from "vitest";
import { getResumenClientes } from "./adminClientes.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockFetchAutenticadoOnce(body = {}, ok = true) {
  fetchAutenticado.mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getResumenClientes", () => {
  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ totalClientes: 0 });

    await getResumenClientes();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/clientes-resumen`, undefined);
  });

  it("manda desde y hasta como query params", async () => {
    mockFetchAutenticadoOnce({ totalClientes: 0 });

    await getResumenClientes({ desde: "2026-08-01", hasta: "2026-08-15" });

    expect(fetchAutenticado).toHaveBeenCalledWith(
      `${BASE}/admin/clientes-resumen?desde=2026-08-01&hasta=2026-08-15`,
      undefined,
    );
  });

  it("ignora valores vacíos", async () => {
    mockFetchAutenticadoOnce({ totalClientes: 0 });

    await getResumenClientes({ desde: "", hasta: undefined });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/clientes-resumen`, undefined);
  });

  it("devuelve el body parseado", async () => {
    const body = {
      totalClientes: 3,
      clientesNuevos: 3,
      clientesRecurrentes: 0,
      tiempoEntreCompras: null,
      rankingClientes: [],
    };
    mockFetchAutenticadoOnce(body);

    await expect(getResumenClientes()).resolves.toEqual(body);
  });

  it("conserva tiempoEntreCompras null sin convertirlo en 0", async () => {
    // Un `null` acá significa "todavía no hay recompras que medir", no cero
    // días. Si el cliente lo normalizara a 0, la UI mentiría.
    mockFetchAutenticadoOnce({ totalClientes: 3, tiempoEntreCompras: null });

    const resumen = await getResumenClientes();

    expect(resumen.tiempoEntreCompras).toBeNull();
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getResumenClientes()).rejects.toThrow("No autorizado.");
  });
});
