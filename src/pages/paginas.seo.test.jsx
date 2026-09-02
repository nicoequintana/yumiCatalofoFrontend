import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../api/products.js", () => ({
  getProducts: vi.fn().mockResolvedValue({ data: [], page: 1, pageSize: 12, total: 0 }),
  // `getProductsByIds` real (`api/products.js`) resuelve al ARRAY pelado
  // (hace `.flatMap` sobre las tandas paginadas), nunca al sobre `{data}` de
  // `getProducts`. El brief mockeaba `{ data: [] }`, que rompía el render de
  // Carrito/Favoritos con "productos.map is not a function" — no por
  // localStorage, sino por un mock que no respeta el contrato real de la
  // función que reemplaza.
  getProductsByIds: vi.fn().mockResolvedValue([]),
  getProductById: vi.fn().mockResolvedValue(null),
  registrarEvento: vi.fn(),
  registrarCompartido: vi.fn(),
  registrarFavorito: vi.fn(),
}));
vi.mock("../api/categorias.js", () => ({ getCategorias: vi.fn().mockResolvedValue([]) }));

const { default: Carrito } = await import("./Carrito.jsx");
const { default: Favoritos } = await import("./Favoritos.jsx");
const { default: Coleccion } = await import("./Coleccion.jsx");

afterEach(cleanup);
beforeEach(() => { document.head.querySelectorAll('meta[name="robots"]').forEach((n) => n.remove()); });

function robots() {
  return document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;
}

describe("noindex en las páginas sin valor de búsqueda", () => {
  it("el carrito lleva noindex", async () => {
    render(<MemoryRouter><Carrito /></MemoryRouter>);
    await waitFor(() => expect(robots()).toBe("noindex, follow"));
  });

  it("favoritos lleva noindex", async () => {
    render(<MemoryRouter><Favoritos /></MemoryRouter>);
    await waitFor(() => expect(robots()).toBe("noindex, follow"));
  });
});

describe("Coleccion", () => {
  it("declara un h1", async () => {
    const { container } = render(<MemoryRouter><Coleccion /></MemoryRouter>);
    await waitFor(() => expect(container.querySelector("h1")).not.toBe(null));
  });

  it("NO lleva noindex en la página 1 sin filtros", async () => {
    render(<MemoryRouter initialEntries={["/coleccion"]}><Coleccion /></MemoryRouter>);
    await waitFor(() => expect(document.title).toContain("YIMA"));
    expect(robots()).toBe(null);
  });

  it("lleva noindex a partir de la segunda tanda de Mostrar más", async () => {
    render(<MemoryRouter initialEntries={["/coleccion?paginas=2"]}><Coleccion /></MemoryRouter>);
    await waitFor(() => expect(robots()).toBe("noindex, follow"));
  });

  it("canoniza siempre a /coleccion limpio, sin los filtros", async () => {
    render(
      <MemoryRouter initialEntries={["/coleccion?paginas=2&minPrecio=100"]}><Coleccion /></MemoryRouter>,
    );
    await waitFor(() => {
      const canonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");
      expect(canonical).toBe("https://yima-productos.com/coleccion");
    });
  });
});
