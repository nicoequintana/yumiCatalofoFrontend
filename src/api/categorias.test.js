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
  it("usa fetchAutenticado y hace POST con el nombre", async () => {
    mockFetchAutenticadoOnce({ id: 5, nombre: "Velas", cantidadProductos: 0 });

    await createCategoria("Velas");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Velas" }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Ya existe una categoría con ese nombre." }, false);

    await expect(createCategoria("Velas")).rejects.toThrow("Ya existe una categoría con ese nombre.");
  });
});

describe("updateCategoria", () => {
  it("usa fetchAutenticado y hace PUT al id indicado", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Aromas", cantidadProductos: 0 });

    await updateCategoria(1, "Aromas");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/categorias/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Aromas" }),
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
