import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminCategorias from "./AdminCategorias.jsx";
import * as categoriasApi from "../../api/categorias.js";

vi.mock("../../api/categorias.js");

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminCategorias />
    </MemoryRouter>,
  );
}

describe("AdminCategorias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista las categorías cargadas", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Iluminación", cantidadProductos: 4 },
    ]);

    renderPagina();

    expect(await screen.findByText("Iluminación")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay categorías", async () => {
    categoriasApi.getCategorias.mockResolvedValue([]);

    renderPagina();

    expect(await screen.findByText("Todavía no hay categorías")).toBeInTheDocument();
  });
});

describe("AdminCategorias — fallos de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un error en vez de quedarse cargando para siempre", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    expect(await screen.findByText(/No se pudieron cargar las categorías/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando categorías…")).not.toBeInTheDocument();
  });

  it("mantiene el formulario de alta usable tras el fallo", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    await screen.findByText(/No se pudieron cargar las categorías/i);
    expect(screen.getByPlaceholderText("Nombre de la nueva categoría")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar/i })).toBeInTheDocument();
  });
});
