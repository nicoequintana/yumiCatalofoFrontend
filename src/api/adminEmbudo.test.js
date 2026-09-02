import { describe, expect, it, vi, beforeEach } from "vitest";
import { getEmbudoConversion } from "./adminEmbudo.js";
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

describe("getEmbudoConversion", () => {
  it("sin filtros no agrega querystring", async () => {
    mockFetchAutenticadoOnce({ etapas: [] });

    await getEmbudoConversion();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/embudo`, undefined);
  });

  it("manda desde y hasta como query params", async () => {
    mockFetchAutenticadoOnce({ etapas: [] });

    await getEmbudoConversion({ desde: "2026-08-01", hasta: "2026-08-15" });

    expect(fetchAutenticado).toHaveBeenCalledWith(
      `${BASE}/admin/embudo?desde=2026-08-01&hasta=2026-08-15`,
      undefined,
    );
  });

  it("ignora valores vacíos", async () => {
    mockFetchAutenticadoOnce({ etapas: [] });

    await getEmbudoConversion({ desde: "", hasta: undefined });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/embudo`, undefined);
  });

  it("devuelve el body parseado", async () => {
    const body = {
      periodo: { desde: "2026-08-01", hasta: "2026-08-19", recortado: false },
      etapas: [{ clave: "VISTAS", etiqueta: "Vistas", cantidad: 10 }],
      tasaGlobal: 0.1,
      confiableDesde: "2026-08-19",
      periodoConfiable: false,
      fuentesTrafico: [],
    };
    mockFetchAutenticadoOnce(body);

    await expect(getEmbudoConversion()).resolves.toEqual(body);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No autorizado." }, false);

    await expect(getEmbudoConversion()).rejects.toThrow("No autorizado.");
  });
});

describe("getEmbudoConversion — período por dias", () => {
  // El rango lo calcula el BACKEND (única fuente del calendario argentino): el
  // frontend manda la intención, nunca fechas calculadas con su propia copia
  // del calendario, que era el espejo manual que podía divergir en silencio.
  it("manda dias como query param", async () => {
    mockFetchAutenticadoOnce({});

    await getEmbudoConversion({ dias: 30 });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/admin/embudo?dias=30`, undefined);
  });
});
