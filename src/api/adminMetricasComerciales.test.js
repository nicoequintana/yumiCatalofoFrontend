import { describe, expect, it, vi } from "vitest";

const fetchAutenticadoMock = vi.fn();
vi.mock("./authClient.js", () => ({
  fetchAutenticado: (...args) => fetchAutenticadoMock(...args),
}));

const { getMetricasComerciales } = await import("./adminMetricasComerciales.js");

describe("getMetricasComerciales", () => {
  it("pega al endpoint sin query cuando no hay filtro", async () => {
    fetchAutenticadoMock.mockResolvedValue({ ok: true, text: async () => "{}" });

    await getMetricasComerciales({});

    expect(fetchAutenticadoMock.mock.calls[0][0]).toMatch(/\/admin\/metricas-comerciales$/);
  });

  it("manda el estado como query cuando viene", async () => {
    fetchAutenticadoMock.mockResolvedValue({ ok: true, text: async () => "{}" });

    await getMetricasComerciales({ estado: "ACTIVA" });

    expect(fetchAutenticadoMock.mock.calls[0][0]).toContain("estado=ACTIVA");
  });

  it("un error del servidor llega como Error con su mensaje", async () => {
    fetchAutenticadoMock.mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ error: "No autorizado." }),
    });

    await expect(getMetricasComerciales({})).rejects.toThrow("No autorizado.");
  });
});
