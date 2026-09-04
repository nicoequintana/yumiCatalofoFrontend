import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PanelCategorias from "./PanelCategorias.jsx";

const CATEGORIAS = [
  { id: 1002, nombre: "Cocina", cantidadPublicados: 27 },
  { id: 1009, nombre: "Accesorios", cantidadPublicados: 18 },
];

function montar(categorias = CATEGORIAS) {
  return render(
    <MemoryRouter>
      <PanelCategorias categorias={categorias} onNavegar={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("PanelCategorias", () => {
  it("Todos va primero y lleva al catálogo sin filtro", () => {
    montar();

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent(/todos/i);
    expect(links[0]).toHaveAttribute("href", "/coleccion");
  });

  it("cada categoría linkea a su ruta propia, no a un querystring", () => {
    montar();

    expect(screen.getByRole("link", { name: /cocina/i })).toHaveAttribute(
      "href",
      "/coleccion/categoria/cocina",
    );
  });

  it("sin categorías sigue ofreciendo Todos", () => {
    montar([]);

    expect(screen.getByRole("link", { name: /todos/i })).toBeInTheDocument();
  });

  it("una categoría sin ruta resoluble se omite: <Link to={null}> es un bug", () => {
    montar([{ id: 99, nombre: "", cantidadPublicados: 3 }]);

    // Solo queda "Todos".
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });
});
