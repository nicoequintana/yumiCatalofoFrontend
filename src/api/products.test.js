import { describe, expect, it, vi, beforeEach } from "vitest";
import { construirFormData, getProducts, registrarFavorito } from "./products.js";

const BASE = "http://localhost:4000/api";

function mockFetchOnce(body = []) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });
}

describe("getProducts", () => {
  beforeEach(() => {
    mockFetchOnce();
  });

  it("sin opciones no agrega querystring", async () => {
    await getProducts();
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products`, undefined);
  });

  it("admin:true agrega ?admin=1 (regresión)", async () => {
    await getProducts({ admin: true });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products?admin=1`, undefined);
  });

  it("admin:false (default) no agrega admin a la querystring", async () => {
    await getProducts({ admin: false });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products`, undefined);
  });

  it("agrega categoria cuando se provee", async () => {
    await getProducts({ categoria: 3 });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products?categoria=3`, undefined);
  });

  it("agrega search cuando se provee", async () => {
    await getProducts({ search: "reloj" });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products?search=reloj`, undefined);
  });

  it("agrega minPrecio cuando se provee", async () => {
    await getProducts({ minPrecio: 100 });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products?minPrecio=100`, undefined);
  });

  it("agrega maxPrecio cuando se provee", async () => {
    await getProducts({ maxPrecio: 500 });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products?maxPrecio=500`, undefined);
  });

  it("omite params no provistos o vacíos de la URL", async () => {
    await getProducts({ search: "", categoria: undefined, minPrecio: null });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products`, undefined);
  });

  it("combina múltiples filtros en una sola querystring", async () => {
    await getProducts({
      categoria: 3,
      search: "reloj",
      minPrecio: 100,
      maxPrecio: 500,
    });

    const url = global.fetch.mock.calls[0][0];
    const [, query] = url.split("?");
    const params = new URLSearchParams(query);

    expect(params.get("categoria")).toBe("3");
    expect(params.get("search")).toBe("reloj");
    expect(params.get("minPrecio")).toBe("100");
    expect(params.get("maxPrecio")).toBe("500");
  });

  it("combina admin con filtros", async () => {
    await getProducts({ admin: true, categoria: 3 });

    const url = global.fetch.mock.calls[0][0];
    const [, query] = url.split("?");
    const params = new URLSearchParams(query);

    expect(params.get("admin")).toBe("1");
    expect(params.get("categoria")).toBe("3");
  });
});

describe("registrarFavorito", () => {
  it("hace POST a /products/:id/favorito", async () => {
    mockFetchOnce({ ok: true });

    await registrarFavorito(7);

    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products/7/favorito`, { method: "POST" });
  });

  it("no lanza si el fetch falla (fire-and-forget)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(registrarFavorito(7)).resolves.toBeUndefined();
  });
});

describe("construirFormData — campos comerciales de texto", () => {
  it("manda el valor cuando el campo tiene contenido", () => {
    const fd = construirFormData({ fraseComercial: "Iluminá donde quieras." });
    expect(fd.get("fraseComercial")).toBe("Iluminá donde quieras.");
  });

  it("manda string vacío (no omite el campo) cuando el valor es null, para poder vaciarlo en edición", () => {
    const fd = construirFormData({
      fraseComercial: null,
      porQueLoVasAQuerer: null,
      tePasaEsto: null,
    });
    expect(fd.get("fraseComercial")).toBe("");
    expect(fd.get("porQueLoVasAQuerer")).toBe("");
    expect(fd.get("tePasaEsto")).toBe("");
  });

  it("omite el campo del todo cuando es undefined (no se tocó ese campo)", () => {
    const fd = construirFormData({});
    expect(fd.has("fraseComercial")).toBe(false);
    expect(fd.has("porQueLoVasAQuerer")).toBe(false);
    expect(fd.has("tePasaEsto")).toBe(false);
  });
});
