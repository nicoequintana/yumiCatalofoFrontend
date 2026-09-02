import { describe, expect, it, vi, beforeEach } from "vitest";
import { getResumenOperacion } from "./adminOperacion.js";
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

describe("getResumenOperacion", () => {
  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ ordenesPorEstado: {} });

    await getResumenOperacion();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/operacion`, undefined);
  });

  it("manda desde y hasta como query params", async () => {
    mockFetchAutenticadoOnce({ ordenesPorEstado: {} });

    await getResumenOperacion({ desde: "2026-08-01", hasta: "2026-08-15" });

    expect(fetchAutenticado).toHaveBeenCalledWith(
      `${BASE}/admin/operacion?desde=2026-08-01&hasta=2026-08-15`,
      undefined,
    );
  });

  it("ignora valores vacíos", async () => {
    mockFetchAutenticadoOnce({ ordenesPorEstado: {} });

    await getResumenOperacion({ desde: "", hasta: undefined });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/operacion`, undefined);
  });

  it("devuelve el body parseado", async () => {
    const body = {
      ordenesPorEstado: { PENDIENTE: 1 },
      ordenesEstancadas: { total: 0, lista: [] },
      quiebresConDemanda: [],
      stockBajo: [],
    };
    mockFetchAutenticadoOnce(body);

    await expect(getResumenOperacion()).resolves.toEqual(body);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getResumenOperacion()).rejects.toThrow("No autorizado.");
  });
});

describe("getResumenOperacion — período por dias", () => {
  // El rango lo calcula el BACKEND (única fuente del calendario argentino): el
  // frontend manda la intención, nunca fechas calculadas con su propia copia
  // del calendario, que era el espejo manual que podía divergir en silencio.
  it("manda dias como query param", async () => {
    mockFetchAutenticadoOnce({});

    await getResumenOperacion({ dias: 30 });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/operacion?dias=30`, undefined);
  });
});
