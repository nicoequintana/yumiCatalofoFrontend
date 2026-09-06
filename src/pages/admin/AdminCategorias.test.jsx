import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminCategorias from "./AdminCategorias.jsx";
import * as categoriasApi from "../../api/categorias.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

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

  // El ícono por categoría se retiró (29/09/2026): la foto lo reemplaza en
  // los círculos de la home y un selector que ya no se muestra en ningún
  // lado es una opción del panel que no hace nada. Estos dos tests son el
  // guard de que no vuelva a colarse en el formulario ni en los payloads.
  it("no muestra el selector de ícono", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Iluminación", cantidadProductos: 4 },
    ]);

    renderPagina();
    await screen.findByText("Iluminación");

    expect(screen.queryByText(/Ícono de la categoría/i)).not.toBeInTheDocument();
  });

  it("al crear, no manda ningún ícono", async () => {
    const usuario = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValueOnce([]);
    categoriasApi.createCategoria.mockResolvedValue({ id: 6, nombre: "Deco", cantidadProductos: 0 });
    categoriasApi.getCategorias.mockResolvedValueOnce([
      { id: 6, nombre: "Deco", cantidadProductos: 0 },
    ]);

    renderPagina();
    await screen.findByText("Todavía no hay categorías");

    await usuario.type(screen.getByPlaceholderText("Nombre de la nueva categoría"), "Deco");
    await usuario.click(screen.getByRole("button", { name: /Agregar/i }));

    expect(categoriasApi.createCategoria).toHaveBeenCalledWith("Deco");
  });

  it("al renombrar, no manda ningún ícono", async () => {
    const usuario = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Iluminación", cantidadProductos: 4 },
    ]);
    categoriasApi.updateCategoria.mockResolvedValue({
      id: 1,
      nombre: "Luces",
      cantidadProductos: 4,
    });

    renderPagina();
    await screen.findByText("Iluminación");

    await usuario.click(screen.getByRole("button", { name: /Renombrar Iluminación/i }));
    const input = screen.getByDisplayValue("Iluminación");
    await usuario.clear(input);
    await usuario.type(input, "Luces");
    await usuario.click(screen.getByRole("button", { name: /Guardar/i }));

    expect(categoriasApi.updateCategoria).toHaveBeenCalledWith(1, "Luces");
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      {
        id: 1,
        nombre: "Iluminación",
        cantidadProductos: 4,
        cantidadPublicados: 4,
        destacadaEnHome: false,
        imagenUrl: null,
      },
    ]);

    renderPagina();

    await screen.findByText("Iluminación");
    esperarTablaApilada(screen.getByRole("table"));
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

  it("si la mutación se aplicó pero la recarga falla, NO muestra el error de la mutación", async () => {
    // `cargarCategorias()` no tenía manejo de error propio: si el refresco
    // fallaba DESPUÉS de un create exitoso, el catch de la mutación mostraba
    // "No se pudo crear la categoría" — pero la categoría SÍ se creó, y el
    // admin iba a reintentar algo que ya pasó (y chocar con el nombre
    // duplicado).
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValueOnce([]); // carga inicial OK
    categoriasApi.createCategoria.mockResolvedValue({ id: 1, nombre: "Deco" });
    categoriasApi.getCategorias.mockRejectedValueOnce(new Error("Failed to fetch")); // refresco caído

    renderPagina();

    await screen.findByText("Todavía no hay categorías");

    await user.type(screen.getByPlaceholderText("Nombre de la nueva categoría"), "Deco");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));

    expect(
      await screen.findByText(/se guardó, pero no se pudo actualizar la lista/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No se pudo crear la categoría/i)).not.toBeInTheDocument();
  });

  it("mantiene el formulario de alta usable tras el fallo", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    await screen.findByText(/No se pudieron cargar las categorías/i);
    expect(screen.getByPlaceholderText("Nombre de la nueva categoría")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar/i })).toBeInTheDocument();
  });
});
