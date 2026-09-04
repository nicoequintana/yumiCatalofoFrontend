import { describe, expect, it, vi, beforeEach } from "vitest";
import { getContadorCampania, guardarProductosDeCampania } from "./campanias.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockRespuesta(body = {}, ok = true) {
  fetchAutenticado.mockResolvedValue({ ok, text: async () => JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guardarProductosDeCampania", () => {
  it("hace PUT a /:id/productos con la lista completa", async () => {
    mockRespuesta({ id: 7, productos: [{ id: 3 }] });

    const detalle = await guardarProductosDeCampania(7, [3, 9]);

    const [url, opciones] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/campanias/7/productos`);
    expect(opciones.method).toBe("PUT");
    expect(JSON.parse(opciones.body)).toEqual({ productIds: [3, 9] });
    // Responde el DETALLE completo: el editor pinta la vitrina con lo que
    // vuelve, sin un segundo GET.
    expect(detalle).toEqual({ id: 7, productos: [{ id: 3 }] });
  });
});

describe("getContadorCampania", () => {
  it("pide los días faltantes al backend, con la fecha en la query", async () => {
    mockRespuesta({ diasFaltantes: 12 });

    const resultado = await getContadorCampania("2026-12-25");

    expect(fetchAutenticado.mock.calls[0][0]).toBe(`${BASE}/campanias/contador?hasta=2026-12-25`);
    expect(resultado).toEqual({ diasFaltantes: 12 });
  });

  it("propaga el error del backend cuando la fecha no sirve", async () => {
    mockRespuesta({ error: "La fecha debe tener el formato AAAA-MM-DD." }, false);

    await expect(getContadorCampania("mañana")).rejects.toThrow(
      "La fecha debe tener el formato AAAA-MM-DD.",
    );
  });
});
