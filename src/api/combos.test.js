import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getCombos,
  getCombo,
  getOpcionesCombo,
  getResumenCombos,
  getAdminCombos,
  cotizarCombo,
  guardarHeroCombo,
  eliminarCombo,
  guardarCombosDeCampania,
} from "./combos.js";
import { fetchAutenticado } from "./authClient.js";
import { TIMEOUT_SUBIDA_MS } from "./http.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function respuestaPublica(body, { ok = true, status = 200 } = {}) {
  global.fetch = vi.fn().mockResolvedValue({ ok, status, text: async () => JSON.stringify(body) });
}

function respuestaAdmin(body, { ok = true, status = 200 } = {}) {
  fetchAutenticado.mockResolvedValue({ ok, status, text: async () => JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("públicas (sin JWT)", () => {
  it("getCombos pide GET /combos sin query y devuelve el cuerpo", async () => {
    respuestaPublica([{ id: 1 }]);

    const combos = await getCombos();

    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/combos`);
    expect(combos).toEqual([{ id: 1 }]);
    expect(fetchAutenticado).not.toHaveBeenCalled();
  });

  it("getCombos con ids arma ?ids=1,2", async () => {
    respuestaPublica([]);

    await getCombos({ ids: [1, 2] });

    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/combos?ids=1%2C2`);
  });

  it("getCombo devuelve el detalle", async () => {
    respuestaPublica({ id: 1, nombre: "Kit" });

    await expect(getCombo("1-kit")).resolves.toEqual({ id: 1, nombre: "Kit" });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/combos/1-kit`);
  });

  it("getCombo devuelve null ante un 404 (no existe o no vigente)", async () => {
    respuestaPublica({ error: "Combo no encontrado." }, { ok: false, status: 404 });

    await expect(getCombo("999-x")).resolves.toBeNull();
  });

  it("getCombo tira con el mensaje del servidor ante otro error", async () => {
    respuestaPublica({ error: "Error interno del servidor" }, { ok: false, status: 500 });

    await expect(getCombo("1-kit")).rejects.toThrow("Error interno del servidor");
  });

  it("getOpcionesCombo pide GET /combos/opciones", async () => {
    respuestaPublica({ minUnidades: 2 });

    await getOpcionesCombo();

    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/combos/opciones`);
  });
});

describe("getResumenCombos", () => {
  it("pide GET /combos/resumen sin JWT y devuelve {cantidad, porcentajeMaximo}", async () => {
    respuestaPublica({ cantidad: 3, porcentajeMaximo: 25 });

    await expect(getResumenCombos()).resolves.toEqual({ cantidad: 3, porcentajeMaximo: 25 });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/combos/resumen`);
    expect(fetchAutenticado).not.toHaveBeenCalled();
  });

  it("tira con el mensaje del servidor ante un error", async () => {
    respuestaPublica({ error: "Demasiadas solicitudes" }, { ok: false, status: 429 });

    await expect(getResumenCombos()).rejects.toThrow("Demasiadas solicitudes");
  });
});

describe("admin (con JWT)", () => {
  it("getAdminCombos pide GET /combos/admin/combos autenticado", async () => {
    respuestaAdmin([]);

    await getAdminCombos();

    expect(fetchAutenticado.mock.calls[0][0]).toBe(`${BASE}/combos/admin/combos`);
  });

  it("cotizarCombo manda POST con items y porcentaje", async () => {
    respuestaAdmin({ precioCombo: "9000" });

    await cotizarCombo({ items: [{ productId: 1, cantidad: 2 }], porcentaje: 15 });

    const [url, opciones] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/combos/admin/combos/cotizar`);
    expect(opciones.method).toBe("POST");
    expect(JSON.parse(opciones.body)).toEqual({ items: [{ productId: 1, cantidad: 2 }], porcentaje: 15 });
  });

  it("guardarHeroCombo manda multipart con el campo 'hero' y el timeout de subidas", async () => {
    respuestaAdmin({ id: 3 });
    const archivo = new File(["x"], "hero.jpg", { type: "image/jpeg" });

    await guardarHeroCombo(3, archivo);

    const [url, opciones, timeout] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/combos/admin/combos/3/hero`);
    expect(opciones.method).toBe("PUT");
    expect(opciones.body.get("hero")).toBe(archivo);
    expect(timeout).toBe(TIMEOUT_SUBIDA_MS);
  });

  it("eliminarCombo tira con el mensaje del servidor (p. ej. 403 sin permiso)", async () => {
    respuestaAdmin({ error: "No tenés permiso para eliminar." }, { ok: false, status: 403 });

    await expect(eliminarCombo(3)).rejects.toThrow("No tenés permiso para eliminar.");
  });

  it("guardarCombosDeCampania manda PUT /campanias/:id/combos", async () => {
    respuestaAdmin({ comboIds: [1] });

    await guardarCombosDeCampania(7, [1]);

    const [url, opciones] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/campanias/7/combos`);
    expect(opciones.method).toBe("PUT");
    expect(JSON.parse(opciones.body)).toEqual({ comboIds: [1] });
  });
});
