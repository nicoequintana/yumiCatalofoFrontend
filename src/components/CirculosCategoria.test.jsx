import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Espía en vez de un stub pelado, mismo patrón que `HojaMenu.test.jsx`: hay
// tests que afirman con qué se renderiza sin depender de la request real.
const categoriasMock = vi.fn();

vi.mock("../hooks/useCategoriasNavbar.js", () => ({
  useCategoriasHome: (...args) => categoriasMock(...args),
}));

const { default: CirculosCategoria } = await import("./CirculosCategoria.jsx");

describe("CirculosCategoria", () => {
  it("pinta el ícono cuando la categoría lo tiene", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 3, nombre: "Hogar", icono: "chair" }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByText("chair")).toBeInTheDocument();
  });

  it("sin ícono cae a la inicial, y no rompe la fila", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 5, nombre: "Mascotas", icono: null }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("cada círculo linkea a su categoría", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 3, nombre: "Hogar", icono: "chair" }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByRole("link", { name: /Hogar/ })).toHaveAttribute(
      "href",
      expect.stringContaining("hogar"),
    );
  });

  it("sin categorías no renderiza nada", () => {
    categoriasMock.mockReturnValue({ categorias: [], resuelto: true });

    const { container } = render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(container).toBeEmptyDOMElement();
  });

  it("agrega un círculo 'Ver todas' al final que lleva a /coleccion", () => {
    categoriasMock.mockReturnValue({
      categorias: [
        { id: 3, nombre: "Hogar", icono: "chair" },
        { id: 5, nombre: "Mascotas", icono: null },
      ],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    // Nombre accesible propio, no heredado del ícono (que va `aria-hidden`).
    const verTodas = screen.getByRole("link", { name: "Ver todas" });
    expect(verTodas).toHaveAttribute("href", "/coleccion");

    // Va al final de la fila, después de las categorías reales — es la
    // puerta de salida del recorrido, no un atajo antes de él.
    const todosLosLinks = screen.getAllByRole("link");
    expect(todosLosLinks[todosLosLinks.length - 1]).toBe(verTodas);
  });

  it("el círculo 'Ver todas' usa el ícono grid_view", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 3, nombre: "Hogar", icono: "chair" }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByText("grid_view")).toBeInTheDocument();
  });
});
