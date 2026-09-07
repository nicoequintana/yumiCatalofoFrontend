import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getEtiquetasAdmin,
  getOpcionesColor,
  createEtiqueta,
  updateEtiqueta,
  deleteEtiqueta,
} from "./etiquetas.js";
import { fetchAutenticado } from "./authClient.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockFetchAutenticadoOnce(body = [], ok = true) {
  fetchAutenticado.mockResolvedValue({
    ok,
    text: async () => JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getEtiquetasAdmin", () => {
  it("usa fetchAutenticado y hace GET a /etiquetas", async () => {
    const etiquetas = [
      { id: 1, nombre: "Oferta", color: "verde", colorFondo: "46 125 50", colorTexto: "255 255 255", cantidadProductos: 3 },
    ];
    mockFetchAutenticadoOnce(etiquetas);

    const resultado = await getEtiquetasAdmin();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas`, undefined);
    expect(resultado).toEqual(etiquetas);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No se pudo obtener el listado de etiquetas." }, false);

    await expect(getEtiquetasAdmin()).rejects.toThrow("No se pudo obtener el listado de etiquetas.");
  });
});

describe("getOpcionesColor", () => {
  it("usa fetchAutenticado y hace GET a /etiquetas/opciones", async () => {
    const opciones = { colores: [{ id: "verde", nombre: "Verde", fondo: "46 125 50", texto: "255 255 255" }] };
    mockFetchAutenticadoOnce(opciones);

    const resultado = await getOpcionesColor();

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas/opciones`, undefined);
    expect(resultado).toEqual(opciones);
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "No se pudo obtener la paleta de colores." }, false);

    await expect(getOpcionesColor()).rejects.toThrow("No se pudo obtener la paleta de colores.");
  });
});

describe("createEtiqueta", () => {
  it("usa fetchAutenticado y hace POST con el nombre y el color", async () => {
    mockFetchAutenticadoOnce({ id: 5, nombre: "Nuevo", color: "azul" });

    await createEtiqueta("Nuevo", "azul");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Nuevo", color: "azul" }),
    });
  });

  it("manda color null cuando no se elige uno", async () => {
    mockFetchAutenticadoOnce({ id: 5, nombre: "Nuevo", color: null });

    await createEtiqueta("Nuevo");

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Nuevo", color: null }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Ya existe una etiqueta llamada Nuevo." }, false);

    await expect(createEtiqueta("Nuevo")).rejects.toThrow("Ya existe una etiqueta llamada Nuevo.");
  });
});

describe("updateEtiqueta", () => {
  it("usa fetchAutenticado y hace PUT al id indicado con los campos parciales", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Renombrada", color: "azul" });

    await updateEtiqueta(1, { nombre: "Renombrada" });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Renombrada" }),
    });
  });

  it("manda color: null explícito para devolver la etiqueta a su color por defecto", async () => {
    mockFetchAutenticadoOnce({ id: 1, nombre: "Oferta", color: null });

    await updateEtiqueta(1, { color: null });

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas/1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color: null }),
    });
  });

  it("lanza Error con el mensaje del backend ante un error", async () => {
    mockFetchAutenticadoOnce({ error: "Ya existe una etiqueta llamada Renombrada." }, false);

    await expect(updateEtiqueta(1, { nombre: "Renombrada" })).rejects.toThrow(
      "Ya existe una etiqueta llamada Renombrada.",
    );
  });
});

describe("deleteEtiqueta", () => {
  it("usa fetchAutenticado y hace DELETE al id indicado", async () => {
    mockFetchAutenticadoOnce({ ok: true });

    await deleteEtiqueta(1);

    expect(fetchAutenticado).toHaveBeenCalledWith(`${BASE}/etiquetas/1`, { method: "DELETE" });
  });

  it("lanza Error con el mensaje del backend, incluido el conteo de productos", async () => {
    mockFetchAutenticadoOnce({ error: "No se puede eliminar: 4 productos usan esta etiqueta." }, false);

    await expect(deleteEtiqueta(1)).rejects.toThrow(
      "No se puede eliminar: 4 productos usan esta etiqueta.",
    );
  });
});
