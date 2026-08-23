import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  MAX_IDS_POR_CONSULTA,
  construirFormData,
  getProductById,
  getProducts,
  getProductsByIds,
  registrarFavorito,
} from "./products.js";
import { getToken } from "./authClient.js";

// Mismo patrón que `adminLogs.test.js`: el módulo de auth se mockea entero.
// Además evita el `localStorage` roto de este entorno de test (ver el comentario
// de `useTemaAdmin.test.jsx`), que haría explotar cualquier lectura real.
vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

const TOKEN = "jwt-de-prueba";

function mockFetchOnce(body = []) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });
}

describe("getProducts", () => {
  beforeEach(() => {
    vi.mocked(getToken).mockReturnValue(TOKEN);
    mockFetchOnce();
  });

  it("sin opciones no agrega querystring", async () => {
    await getProducts();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products`);
  });

  it("admin:true agrega ?admin=1 (regresión)", async () => {
    await getProducts({ admin: true });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/products?admin=1`);
  });

  it("admin:false (default) no agrega admin a la querystring", async () => {
    await getProducts({ admin: false });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products`);
  });

  it("agrega categoria cuando se provee", async () => {
    await getProducts({ categoria: 3 });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?categoria=3`);
  });

  it("agrega search cuando se provee", async () => {
    await getProducts({ search: "reloj" });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?search=reloj`);
  });

  it("agrega minPrecio cuando se provee", async () => {
    await getProducts({ minPrecio: 100 });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?minPrecio=100`);
  });

  it("agrega maxPrecio cuando se provee", async () => {
    await getProducts({ maxPrecio: 500 });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?maxPrecio=500`);
  });

  it("omite params no provistos o vacíos de la URL", async () => {
    await getProducts({ search: "", categoria: undefined, minPrecio: null });
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products`);
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

/**
 * El backend habilita la vista admin (ocultos + agotados) desde el JWT
 * verificado, no desde `?admin=1`. Sin estos headers, las pantallas del admin
 * verían exactamente lo mismo que un visitante anónimo.
 */
describe("getProducts / getProductById — el token viaja en modo admin", () => {
  beforeEach(() => {
    vi.mocked(getToken).mockReset().mockReturnValue(TOKEN);
    mockFetchOnce();
  });

  it("admin:true manda el JWT en el header Authorization", async () => {
    await getProducts({ admin: true });

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("sin admin NO manda el token (la llamada pública sigue siendo anónima)", async () => {
    await getProducts();

    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products`);
    expect(global.fetch.mock.calls[0][1]?.headers).toBeUndefined();
    expect(getToken).not.toHaveBeenCalled();
  });

  it("admin:true sin token guardado no manda un header vacío", async () => {
    vi.mocked(getToken).mockReturnValue(null);

    await getProducts({ admin: true });

    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?admin=1`);
    expect(global.fetch.mock.calls[0][1]?.headers).toBeUndefined();
  });

  it("no explota si leer el token lanza (localStorage bloqueado)", async () => {
    vi.mocked(getToken).mockImplementation(() => {
      throw new Error("acceso a localStorage denegado");
    });

    await expect(getProducts({ admin: true })).resolves.toBeDefined();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?admin=1`);
  });

  it("getProductById con admin:true manda el JWT", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 4 }),
    });

    await getProductById(4, { admin: true });

    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/products/4?admin=1`);
    expect(opciones.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it("getProductById público no manda token y sigue devolviendo null ante un 404", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ error: "Producto no encontrado." }),
    });

    await expect(getProductById(4)).resolves.toBeNull();
    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products/4`);
  });

  it("getProductsByIds propaga el token a cada tanda", async () => {
    mockFetchOnce({ data: [], page: 1, pageSize: 100, total: 0 });

    await getProductsByIds([4], { admin: true });

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });
});

describe("timeout en las lecturas públicas", () => {
  it("getProducts adjunta una señal de timeout al fetch", async () => {
    mockFetchOnce();

    await getProducts();

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it("getProductById adjunta una señal de timeout al fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 4 }),
    });

    await getProductById(4);

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
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

describe("construirFormData — orden de fotos", () => {
  it("manda la secuencia final mezclando existentes y nuevas", () => {
    // La posición 0 es la portada y la 1 es la imagen de "¿Qué problema
    // resuelve?": el backend necesita la secuencia completa, porque
    // `fotosExistentes` sola no dice dónde va cada foto nueva.
    const fd = construirFormData({
      fotosExistentes: [10],
      fotosNuevas: [new File(["a"], "portada.jpg"), new File(["b"], "extra.jpg")],
      ordenFotos: [
        { tipo: "nueva", index: 0 },
        { tipo: "existente", id: 10 },
        { tipo: "nueva", index: 1 },
      ],
    });

    expect(JSON.parse(fd.get("ordenFotos"))).toEqual([
      { tipo: "nueva", index: 0 },
      { tipo: "existente", id: 10 },
      { tipo: "nueva", index: 1 },
    ]);
  });

  it("no manda ordenFotos si no se lo pasa", () => {
    const fd = construirFormData({ fotosExistentes: [1] });
    expect(fd.get("ordenFotos")).toBeNull();
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

describe("getProductsByIds", () => {
  function mockFetchPorLlamada(cuerpos) {
    let llamada = 0;
    global.fetch = vi.fn().mockImplementation(async () => {
      const body = cuerpos[llamada++] ?? { data: [], page: 1, pageSize: 100, total: 0 };
      return { ok: true, text: async () => JSON.stringify(body) };
    });
  }

  it("pide solo los ids indicados", async () => {
    mockFetchPorLlamada([{ data: [{ id: 1 }, { id: 7 }], page: 1, pageSize: 100, total: 2 }]);

    const productos = await getProductsByIds([1, 7]);

    expect(global.fetch.mock.calls[0][0]).toBe(`${BASE}/products?ids=1%2C7`);
    expect(productos).toEqual([{ id: 1 }, { id: 7 }]);
  });

  it("no hace ninguna request cuando la lista está vacía", async () => {
    global.fetch = vi.fn();

    const productos = await getProductsByIds([]);

    expect(productos).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("parte la lista en tandas del tope del backend y concatena el resultado", async () => {
    const ids = Array.from({ length: MAX_IDS_POR_CONSULTA + 3 }, (_, i) => i + 1);
    const sobre = (filas) => ({ data: filas, page: 1, pageSize: 100, total: filas.length });
    mockFetchPorLlamada([
      sobre(ids.slice(0, MAX_IDS_POR_CONSULTA).map((id) => ({ id }))),
      sobre(ids.slice(MAX_IDS_POR_CONSULTA).map((id) => ({ id }))),
    ]);

    const productos = await getProductsByIds(ids);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(productos).toHaveLength(ids.length);
    expect(productos.at(-1)).toEqual({ id: ids.at(-1) });
  });

  it("propaga la opción admin", async () => {
    mockFetchPorLlamada([{ data: [], page: 1, pageSize: 100, total: 0 }]);

    await getProductsByIds([4], { admin: true });

    const url = global.fetch.mock.calls[0][0];
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("admin")).toBe("1");
    expect(params.get("ids")).toBe("4");
  });
});
