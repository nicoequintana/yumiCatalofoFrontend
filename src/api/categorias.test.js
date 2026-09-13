import { describe, expect, it, vi, beforeEach } from "vitest";
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from "./categorias.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockFetchOnce(body = []) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => JSON.stringify(body),
  });
}

function mockFetchAutenticadoOnce(body = [], ok = true) {
  fetchAutenticado.mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCategorias", () => {
  it("usa fetch plano (NO autenticado) — lo consume la página pública /coleccion", async () => {
    mockFetchOnce([{ id: 1, nombre: "Velas", cantidadProductos: 2 }]);

    const resultado = await getCategorias();

    const [url, opciones] = global.fetch.mock.calls[0];
    expect(url).toBe(`${BASE}/categorias`);
    // La señal de timeout viaja también acá; lo que importa es que NO sea la
    // versión autenticada (un 401 acá redirigiría a un anónimo al login).
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
    expect(fetchAutenticado).not.toHaveBeenCalled();
    expect(resultado).toEqual([{ id: 1, nombre: "Velas", cantidadProductos: 2 }]);
  });
});

describe("createCategoria", () => {
  it("usa fetchAutenticado y hace POST con el nombre y el ícono explícito", async () => {
    mockFetchAutenticadoOnce({ id: 5, nombre: "Velas", cantidadProductos: 0 });

    await createCategoria("Velas", null);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Velas", icono: null }),
    });
  });

  // El tercer argumento ya NO tiene default: se quitó a propósito (spec
  // `docs/superpowers/specs/2026-09-13-rediseno-home-publica-design.md`, §3),
  // para que cada llamador decida en vez de heredar un `null` silencioso. Sin
  // él, el body ni siquiera lleva la clave — que es justo lo que hace SEGURO
  // omitirlo por accidente: el backend (`parsearIcono`) preserva el ícono
  // vigente cuando la clave no viene, así que un llamador que se olvida ya no
  // borra nada, sólo dejó de decidir.
  it("sin tercer argumento, el body no lleva la clave icono (el backend la preserva)", async () => {
    mockFetchAutenticadoOnce({ id: 5, nombre: "Velas", cantidadProductos: 0 });

    await createCategoria("Velas");

    const [, opciones] = fetchAutenticado.mock.calls[0];
    expect(JSON.parse(opciones.body)).not.toHaveProperty("icono");
  });

  it("manda el ícono elegido", async () => {
    mockFetchAutenticadoOnce({ id: 5, nombre: "Velas", cantidadProductos: 0, icono: "spa" });

    await createCategoria("Velas", "spa");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Velas", icono: "spa" }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Ya existe una categoría con ese nombre." }, false);

    await expect(createCategoria("Velas")).rejects.toThrow("Ya existe una categoría con ese nombre.");
  });
});

describe("updateCategoria", () => {
  it("usa fetchAutenticado y hace PUT al id indicado, con el ícono explícito", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Aromas", cantidadProductos: 0 });

    await updateCategoria(1, "Aromas", null);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Aromas", icono: null }),
    });
  });

  // El backend YA distingue "la clave no vino" (preserva) de "vino en null"
  // (borra) — ver `categorias.controller.js` (`parsearIcono`). Acá se afirma
  // la mitad del frontend: sin tercer argumento, el body no fuerza ningún
  // valor.
  it("updateCategoria manda el icono explícito, incluso null", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Cocina", cantidadProductos: 0 });

    await updateCategoria(1, "Cocina", null);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Cocina", icono: null }),
    });
  });

  it("sin tercer argumento, el body no lleva la clave icono (el backend la preserva)", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Aromas", cantidadProductos: 0 });

    await updateCategoria(1, "Aromas");

    const [, opciones] = fetchAutenticado.mock.calls[0];
    expect(JSON.parse(opciones.body)).not.toHaveProperty("icono");
  });

  // `PUT /categorias/:id` es FULL-REPLACE del lado del backend: un `icono`
  // ausente en el body preserva el vigente (ver el fix de `parsearIcono`),
  // pero un llamador que SÍ tiene un ícono vigente lo tiene que mandar de
  // todos modos si lo que quiere es afirmarlo, no sólo no tocarlo.
  it("manda el ícono vigente para reafirmarlo en un PUT full-replace", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Aromas", cantidadProductos: 0, icono: "spa" });

    await updateCategoria(1, "Aromas", "spa");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Aromas", icono: "spa" }),
    });
  });
});

describe("deleteCategoria", () => {
  it("usa fetchAutenticado y hace DELETE al id indicado", async () => {
    mockFetchAutenticadoOnce({ ok: true });

    await deleteCategoria(1);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias/1`, { method: "DELETE" });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No se puede eliminar: 2 productos usan esta categoría." }, false);

    await expect(deleteCategoria(1)).rejects.toThrow(
      "No se puede eliminar: 2 productos usan esta categoría.",
    );
  });
});
