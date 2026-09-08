import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getContadorCampania, guardarProductosDeCampania, registrarEventoComercial } from "./campanias.js";
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

describe("registrarEventoComercial", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 201 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("pega a la ruta de campañas cuando viene campaniaId", async () => {
    await registrarEventoComercial({
      tipo: "IMPRESION_COMERCIAL",
      origen: "MODAL",
      campaniaId: 7,
      promocionId: null,
    });

    const [url, opciones] = globalThis.fetch.mock.calls[0];
    expect(url).toContain("/campanias/7/evento");
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(opciones.body)).toEqual({
      tipo: "IMPRESION_COMERCIAL",
      origen: "MODAL",
    });
  });

  it("pega a la ruta de promociones cuando viene promocionId", async () => {
    await registrarEventoComercial({
      tipo: "IMPRESION_COMERCIAL",
      origen: "BANNER",
      campaniaId: null,
      promocionId: 9,
    });

    expect(globalThis.fetch.mock.calls[0][0]).toContain("/promociones/9/evento");
  });

  it("incluye el destino solo cuando viene", async () => {
    await registrarEventoComercial({
      tipo: "CLICK_COMERCIAL",
      origen: "BANNER",
      campaniaId: 7,
      destino: "CAMPANIA",
    });

    expect(JSON.parse(globalThis.fetch.mock.calls[0][1].body)).toEqual({
      tipo: "CLICK_COMERCIAL",
      origen: "BANNER",
      destino: "CAMPANIA",
    });
  });

  it("sin ninguna referencia no pega a ningún lado", async () => {
    await registrarEventoComercial({
      tipo: "IMPRESION_COMERCIAL",
      origen: "BANNER",
      campaniaId: null,
      promocionId: null,
    });

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("no lanza cuando la red falla", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin red")));

    await expect(
      registrarEventoComercial({ tipo: "IMPRESION_COMERCIAL", origen: "MODAL", campaniaId: 7 }),
    ).resolves.toBeUndefined();
  });

  it("avisa por consola cuando la respuesta no es ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await registrarEventoComercial({ tipo: "IMPRESION_COMERCIAL", origen: "MODAL", campaniaId: 999 });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("404"));
    warn.mockRestore();
  });
});
