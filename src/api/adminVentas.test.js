import { describe, expect, it, vi, beforeEach } from "vitest";
import { getResumenVentas } from "./adminVentas.js";
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

describe("getResumenVentas", () => {
  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ ingresosTotales: "0.00" });

    await getResumenVentas();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/ventas`, undefined);
  });

  it("manda desde y hasta como query params", async () => {
    mockFetchAutenticadoOnce({ ingresosTotales: "0.00" });

    await getResumenVentas({ desde: "2026-08-01", hasta: "2026-08-15" });

    expect(fetchAutenticado).toHaveBeenCalledWith(
      `${BASE}/admin/ventas?desde=2026-08-01&hasta=2026-08-15`,
      undefined,
    );
  });

  it("ignora valores vacíos", async () => {
    mockFetchAutenticadoOnce({ ingresosTotales: "0.00" });

    await getResumenVentas({ desde: "", hasta: undefined });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/ventas`, undefined);
  });

  it("devuelve el body parseado", async () => {
    const body = {
      ingresosTotales: "3500.50",
      cantidadOrdenes: 2,
      rankingProductos: [],
      serieTemporal: [],
    };
    mockFetchAutenticadoOnce(body);

    await expect(getResumenVentas()).resolves.toEqual(body);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getResumenVentas()).rejects.toThrow("No autorizado.");
  });
});
