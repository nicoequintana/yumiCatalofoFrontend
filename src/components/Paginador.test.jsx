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
