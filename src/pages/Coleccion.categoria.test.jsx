import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const getProductsMock = vi.fn();
const getCategoriasMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProducts: (...a) => getProductsMock(...a),
  registrarEvento: vi.fn(),
  registrarFavorito: vi.fn(),
}));
vi.mock("../api/categorias.js", () => ({ getCategorias: (...a) => getCategoriasMock(...a) }));

const { default: Coleccion } = await import("./Coleccion.jsx");

function renderEn(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/coleccion" element={<Coleccion />} />
        <Route path="/coleccion/categoria/:slugCategoria" element={<Coleccion />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(cleanup);
beforeEach(() => {
  getProductsMock.mockReset().mockResolvedValue({ data: [], page: 1, pageSize: 12, total: 0 });
  getCategoriasMock.mockReset().mockResolvedValue([
    { id: 3, nombre: "Cocina y hogar" },
    { id: 4, nombre: "Oficina" },
  ]);
});

describe("/coleccion/categoria/:slugCategoria", () => {
  it("filtra por la categoría de la RUTA, sin blanquearla al montar", async () => {
    renderEn("/coleccion/categoria/cocina-y-hogar");

    // Es lo que distingue esta ruta de `?categoria=`: la categoría de la ruta
    // es la identidad de la página, no un filtro heredado.
    await waitFor(() =>
      expect(getProductsMock).toHaveBeenCalledWith(expect.objectContaining({ categoria: "3" })),
    );
  });

  it("usa el nombre de la categoría como h1 y como título", async () => {
    const { container } = renderEn("/coleccion/categoria/cocina-y-hogar");

    await waitFor(() => expect(container.querySelector("h1").textContent).toBe("Cocina y hogar"));
    expect(document.title).toBe("Cocina y hogar — YIMA");
  });

  it("canoniza a su propia URL, no a /coleccion", async () => {
    renderEn("/coleccion/categoria/cocina-y-hogar");

    await waitFor(() => {
      const canonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute("href");
      expect(canonical).toBe("https://yima-productos.com/coleccion/categoria/cocina-y-hogar");
    });
  });

  it("sigue blanqueando search y precio heredados de la querystring", async () => {
    renderEn("/coleccion/categoria/cocina-y-hogar?search=cuchillo&minPrecio=100");

    await waitFor(() => expect(getProductsMock).toHaveBeenCalled());
    const args = getProductsMock.mock.calls.at(-1)[0];
    expect(args.search).toBeFalsy();
    expect(args.minPrecio).toBeFalsy();
  });

  it("un slug de categoría inexistente no filtra por una categoría inventada", async () => {
    renderEn("/coleccion/categoria/no-existe");

    await waitFor(() => expect(getProductsMock).toHaveBeenCalled());
    const args = getProductsMock.mock.calls.at(-1)[0];
    expect(args.categoria).toBeFalsy();
  });

  // Fix de review (Hallazgo 1): `hayFiltrosActivos` no contaba la categoría de
  // la RUTA (solo miraba `?categoria=`, vacío en esta ruta), así que una
  // categoría real sin productos mostraba "Todavía no hay productos" — le dice
  // al visitante que el catálogo entero está vacío, en vez de "Sin
  // resultados", que es lo que corresponde a un filtro sin coincidencias.
  it("una categoría de ruta sin productos muestra 'Sin resultados', no 'Todavía no hay productos'", async () => {
    // El mock por default ya resuelve `{ data: [], total: 0 }` (ver
    // `beforeEach`), así que alcanza con renderizar una categoría real.
    const { findByText, queryByText } = renderEn("/coleccion/categoria/cocina-y-hogar");

    expect(await findByText("Sin resultados")).toBeTruthy();
    expect(queryByText("Todavía no hay productos")).toBeNull();
  });
});
