import { describe, expect, it, vi, beforeEach } from "vitest";
import { getProducts } from "./products.js";

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

  it("agrega disponibilidad cuando se provee", async () => {
    await getProducts({ disponibilidad: "DISPONIBLE" });
    expect(global.fetch).toHaveBeenCalledWith(`${BASE}/products?disponibilidad=DISPONIBLE`, undefined);
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
      disponibilidad: "DISPONIBLE",
    });

    const url = global.fetch.mock.calls[0][0];
    const [, query] = url.split("?");
    const params = new URLSearchParams(query);

    expect(params.get("categoria")).toBe("3");
    expect(params.get("search")).toBe("reloj");
    expect(params.get("minPrecio")).toBe("100");
    expect(params.get("maxPrecio")).toBe("500");
    expect(params.get("disponibilidad")).toBe("DISPONIBLE");
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
