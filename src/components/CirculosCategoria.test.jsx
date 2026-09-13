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
  it("con icono, muestra el símbolo de Material Symbols sobre un fondo de color", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 3, nombre: "Hogar", icono: "restaurant", destacadaEnHome: false }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByText("restaurant")).toBeInTheDocument();
  });

  it("sin icono, cae al ícono genérico 'category'", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 5, nombre: "Mascotas", icono: null, destacadaEnHome: false }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByText("category")).toBeInTheDocument();
  });

  it("el color de fondo es el MISMO para la misma categoría entre dos renders", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 3, nombre: "Hogar", icono: "restaurant", destacadaEnHome: false }],
      resuelto: true,
    });

    const { container: c1 } = render(<CirculosCategoria />, { wrapper: MemoryRouter });
    const { container: c2 } = render(<CirculosCategoria />, { wrapper: MemoryRouter });
    const estilo = (c) => c.querySelector("[data-testid='fondo-circulo']")?.getAttribute("style");
    expect(estilo(c1)).toBe(estilo(c2));
  });

  it("dos categorías distintas pueden tener colores de fondo distintos", () => {
    categoriasMock.mockReturnValue({
      categorias: [
        { id: 3, nombre: "Hogar", icono: "restaurant", destacadaEnHome: false },
        { id: 7, nombre: "Tecnología", icono: "devices", destacadaEnHome: false },
      ],
      resuelto: true,
    });

    const { container } = render(<CirculosCategoria />, { wrapper: MemoryRouter });
    const fondos = [...container.querySelectorAll("[data-testid='fondo-circulo']")].map((el) =>
      el.getAttribute("style"),
    );
    // No es una garantía matemática (dos slugs pueden hashear al mismo color),
    // pero con estos dos nombres concretos caen en pares distintos — si un
    // cambio de paleta o de hash los junta, el test avisa.
    expect(new Set(fondos).size).toBeGreaterThan(1);
  });

  it("el borde es primary cuando la categoría está destacada, y outline-variant cuando no", () => {
    categoriasMock.mockReturnValue({
      categorias: [
        { id: 3, nombre: "Hogar", icono: "restaurant", destacadaEnHome: true },
        { id: 5, nombre: "Mascotas", icono: "pets", destacadaEnHome: false },
      ],
      resuelto: true,
    });

    const { container } = render(<CirculosCategoria />, { wrapper: MemoryRouter });
    const fondos = [...container.querySelectorAll("[data-testid='fondo-circulo']")];
    expect(fondos[0].className).toMatch(/border-primary/);
    expect(fondos[1].className).toMatch(/border-outline-variant/);
  });

  it("cada círculo linkea a su categoría", () => {
    categoriasMock.mockReturnValue({
      categorias: [{ id: 3, nombre: "Hogar", icono: null, destacadaEnHome: false }],
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
        { id: 3, nombre: "Hogar", icono: null, destacadaEnHome: false },
        { id: 5, nombre: "Mascotas", icono: null, destacadaEnHome: false },
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
      categorias: [{ id: 3, nombre: "Hogar", icono: null, destacadaEnHome: false }],
      resuelto: true,
    });

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    expect(screen.getByText("grid_view")).toBeInTheDocument();
  });
});
