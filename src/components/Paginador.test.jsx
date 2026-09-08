import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Paginador from "./Paginador.jsx";

function renderPaginador(props = {}) {
  const onCambiar = vi.fn();
  render(
    <Paginador
      pagina={1}
      totalPaginas={5}
      onCambiar={onCambiar}
      etiqueta="Paginación de productos"
      {...props}
    />,
  );
  return { onCambiar };
}

describe("Paginador", () => {
  it("es un nav con nombre accesible", () => {
    renderPaginador();

    expect(screen.getByRole("navigation", { name: "Paginación de productos" })).toBeInTheDocument();
  });

  it("marca la página actual con aria-current", () => {
    renderPaginador({ pagina: 3 });

    const actual = screen.getByRole("button", { name: "Página 3" });
    expect(actual).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Página 2" })).not.toHaveAttribute("aria-current");
  });

  it("deshabilita anterior en la primera página y siguiente en la última", () => {
    renderPaginador({ pagina: 1 });
    expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeEnabled();
  });

  it("deshabilita siguiente en la última página", () => {
    renderPaginador({ pagina: 5 });
    expect(screen.getByRole("button", { name: /siguiente/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeEnabled();
  });

  it("navega con los botones de número y de flecha", async () => {
    const user = userEvent.setup();
    const { onCambiar } = renderPaginador({ pagina: 2 });

    await user.click(screen.getByRole("button", { name: "Página 5" }));
    expect(onCambiar).toHaveBeenCalledWith(5);

    await user.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onCambiar).toHaveBeenCalledWith(3);

    await user.click(screen.getByRole("button", { name: /anterior/i }));
    expect(onCambiar).toHaveBeenCalledWith(1);
  });

  it("no se renderiza cuando hay una sola página", () => {
    const { container } = render(
      <Paginador pagina={1} totalPaginas={1} onCambiar={vi.fn()} etiqueta="Paginación" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("condensa el rango con elipsis en catálogos largos, sin perder primera ni última", () => {
    renderPaginador({ pagina: 10, totalPaginas: 20 });

    expect(screen.getByRole("button", { name: "Página 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 20" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 9" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 11" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Página 5" })).not.toBeInTheDocument();
    // Las elipsis son decorativas: no deben anunciarse como controles.
    expect(screen.getAllByRole("button").every((b) => b.textContent !== "…")).toBe(true);
  });

  it("anuncia la posición actual para lectores de pantalla", () => {
    renderPaginador({ pagina: 2, totalPaginas: 7 });

    expect(screen.getByText("Página 2 de 7")).toBeInTheDocument();
  });
});

/**
 * Área táctil (WCAG 2.5.8). Medido en navegador el 07/09/2026 sobre
 * `/catalogo/admin/productos` con `elementFromPoint` —el área EFECTIVA, no la
 * caja declarada—: las flechas daban **44×41** y los números **40×41**, las dos
 * por debajo de 44×44. Son botones sueltos de una barra de navegación: pueden
 * crecer los 3-4px que faltan sin apretar nada.
 *
 * `min-h-11 min-w-11` va ADEMÁS del `h-10 min-w-10`, no en lugar de él (mismo
 * criterio que `SelectorCantidad.jsx`).
 */
describe("Paginador — área táctil", () => {
  it("todos los botones declaran el mínimo táctil de 44×44", () => {
    renderPaginador({ pagina: 2 });

    for (const boton of screen.getAllByRole("button")) {
      expect(boton.className.split(" ")).toContain("min-h-11");
      expect(boton.className.split(" ")).toContain("min-w-11");
    }
  });
});
