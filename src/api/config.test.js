import { describe, expect, it, vi, beforeEach } from "vitest";
import { getConfiguracionHome, getConfiguracionHomeAdmin, actualizarConfiguracionHome } from "./config.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockFetchOnce(body = { productoIcono: null }, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchAutenticadoOnce(body = { productoIcono: null }, ok = true) {
  fetchAutenticado.mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * `GET`/`PUT /config/home` — producto ícono de la home (T5/T7).
 *
 * Lo que esta suite fija:
 *
 *   1. `getConfiguracionHome` usa `fetch` plano (T5: es PÚBLICO, sin auth) —
 *      lo consume también la home pública (T14).
 *   2. `actualizarConfiguracionHome` usa `fetchAutenticado` y manda
 *      `productoIconoId` por `PUT` — requiere sesión admin (T5).
 */
describe("getConfiguracionHome", () => {
  it("usa fetch plano (NO autenticado) y pide GET /config/home", async () => {
    mockFetchOnce({ productoIcono: null });

    const resultado = await getConfiguracionHome();

    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/config/home`);
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
    expect(fetchAutenticado).not.toHaveBeenCalled();
    expect(resultado).toEqual({ productoIcono: null });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchOnce({ error: "Ocurrió un error." }, false);

    await expect(getConfiguracionHome()).rejects.toThrow("Ocurrió un error.");
  });
});

/**
 * `getConfiguracionHomeAdmin` — revisión de T7.
 *
 * `getConfiguracionHome` (público) degrada `productoIcono` a `null` cuando el
 * producto elegido está oculto/sin stock, así que el panel no puede usarlo
 * para saber CUÁL es la elección vigente. Esta variante autenticada pide el
 * MISMO endpoint pero con el token admin, que el backend usa para sumar
 * `productoIconoId` sin degradar (mismo criterio que `getConfigContactoAdmin`).
 */
describe("getConfiguracionHomeAdmin", () => {
  it("usa fetchAutenticado contra GET /config/home", async () => {
    mockFetchAutenticadoOnce({ productoIcono: null, productoIconoId: null });

    const resultado = await getConfiguracionHomeAdmin();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/config/home`);
    expect(resultado).toEqual({ productoIcono: null, productoIconoId: null });
  });

  it("trae productoIconoId aunque productoIcono venga degradado a null", async () => {
    mockFetchAutenticadoOnce({ productoIcono: null, productoIconoId: 9 });

    const resultado = await getConfiguracionHomeAdmin();

    expect(resultado).toEqual({ productoIcono: null, productoIconoId: 9 });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Ocurrió un error." }, false);

    await expect(getConfiguracionHomeAdmin()).rejects.toThrow("Ocurrió un error.");
  });
});

describe("actualizarConfiguracionHome", () => {
  it("usa fetchAutenticado y hace PUT con productoIconoId", async () => {
    mockFetchAutenticadoOnce({ productoIcono: { id: 9 } });

    const resultado = await actualizarConfiguracionHome(9);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/config/home`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoIconoId: 9 }),
    });
    expect(resultado).toEqual({ productoIcono: { id: 9 } });
  });

  it("acepta null para quitar el producto ícono", async () => {
    mockFetchAutenticadoOnce({ productoIcono: null });

    await actualizarConfiguracionHome(null);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/config/home`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productoIconoId: null }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "productoIconoId debe ser un entero o null." }, false);

    await expect(actualizarConfiguracionHome(999999999999)).rejects.toThrow(
      "productoIconoId debe ser un entero o null.",
    );
  });
});
