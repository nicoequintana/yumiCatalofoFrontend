import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminPromociones from "./AdminPromociones.jsx";
import * as promocionesApi from "../../api/promociones.js";
import * as categoriasApi from "../../api/categorias.js";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/promociones.js");
vi.mock("../../api/categorias.js");
vi.mock("../../api/products.js");

/**
 * Sobre de página del listado comercial. Los tests declaran las filas y el
 * helper arma `{ data, page, pageSize, total }` alrededor, mismo patrón que
 * `AdminProductos.test.jsx`.
 */
function listado(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 20, total: filas.length, ...extra };
}

const FILA = {
  id: 21,
  sku: "YIMA-1",
  nombre: "Velador LED",
  categoria: { id: 1, nombre: "Hogar" },
  fotoPortada: null,
  visibleEnCatalogo: true,
  stock: 4,
  vistas: 120,
  unidadesVendidas: 2,
  conversion: 1.6,
  costo: "8000",
  coeficiente: "2.50",
  precio: "20000",
  promociones: [],
};

function renderPagina(initial = "/") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminPromociones />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  promocionesApi.getPromociones.mockResolvedValue([]);
  promocionesApi.getListadoComercial.mockResolvedValue(listado([FILA]));
  promocionesApi.getConflictos.mockResolvedValue([]);
  categoriasApi.getCategorias.mockResolvedValue([
    { id: 1, nombre: "Hogar" },
    { id: 3, nombre: "Cocina" },
  ]);
  productsApi.getEtiquetas.mockResolvedValue({
    etiquetas: [
      { id: 2, nombre: "Nuevo", cantidadProductos: 4 },
      { id: 5, nombre: "Oferta", cantidadProductos: 2 },
    ],
  });
});

describe("AdminPromociones — filtros de categoría y etiqueta", () => {
  it("carga las opciones de categoría y etiqueta al montar, con el conteo en la etiqueta", async () => {
    renderPagina();

    const selectCategoria = await screen.findByLabelText("Categoría");
    expect(within(selectCategoria).getByRole("option", { name: "Hogar" })).toBeInTheDocument();
    expect(within(selectCategoria).getByRole("option", { name: "Cocina" })).toBeInTheDocument();

    const selectEtiqueta = screen.getByLabelText("Etiqueta");
    expect(within(selectEtiqueta).getByRole("option", { name: "Oferta (2)" })).toBeInTheDocument();
    expect(within(selectEtiqueta).getByRole("option", { name: "Nuevo (4)" })).toBeInTheDocument();
  });

  it("filtrar por categoría manda el id al backend y vuelve a la página 1", async () => {
    const user = userEvent.setup();
    renderPagina("/?page=2");
    await screen.findByText("Velador LED");

    await user.selectOptions(await screen.findByLabelText("Categoría"), "3");

    await waitFor(() => {
      expect(promocionesApi.getListadoComercial).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoria: "3", page: 1 }),
      );
    });
  });

  it("filtrar por etiqueta manda el id al backend", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Velador LED");

    await user.selectOptions(await screen.findByLabelText("Etiqueta"), "5");

    await waitFor(() => {
      expect(promocionesApi.getListadoComercial).toHaveBeenLastCalledWith(
        expect.objectContaining({ etiqueta: "5" }),
      );
    });
  });

  it("cambiar un filtro limpia la selección de checkboxes", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Velador LED");

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Velador LED" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.selectOptions(await screen.findByLabelText("Categoría"), "1");

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Seleccionar Velador LED" })).not.toBeChecked(),
    );
  });

  it("los filtros viven en la URL: entrar con ?categoria= precarga el select y pide ese filtro", async () => {
    renderPagina("/?categoria=3");
    await screen.findByText("Velador LED");

    expect(screen.getByLabelText("Categoría")).toHaveValue("3");
    await waitFor(() => {
      expect(promocionesApi.getListadoComercial).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "3" }),
      );
    });
  });

  it("un fallo al traer categorías o etiquetas no rompe la pantalla (fallo blando a [])", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("network"));
    productsApi.getEtiquetas.mockRejectedValue(new Error("network"));

    renderPagina();

    const selectCategoria = await screen.findByLabelText("Categoría");
    // Solo queda la opción "Todas": filtrar sigue siendo posible por URL, y la
    // tabla de abajo —lo que esta pantalla existe para mostrar— no se entera.
    expect(within(selectCategoria).getAllByRole("option")).toHaveLength(1);
  });

  it("NO hay ordenamiento: la pantalla sigue diciendo que está ordenada por vistas", async () => {
    renderPagina();
    await screen.findByText("Velador LED");

    expect(
      screen.getByText("Qué se mira, qué se vende y a qué precio. Ordenado por vistas."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/ordenar por/i)).not.toBeInTheDocument();
  });
});
