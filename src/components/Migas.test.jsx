import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Migas from "./Migas.jsx";

/**
 * Componente compartido de migas de pan del catálogo público — el mismo
 * marcado que `PaginaCombo.jsx` estrenó (chevron `chevron_right`, links en
 * `text-primary-container`, aria-label "Miga de pan"). Recibe `items` como
 * `{ label, to }[]`: todos menos el último son `<Link>`, el último es la
 * página actual (texto plano, `aria-current="page"`).
 */
function montar(items) {
  return render(
    <MemoryRouter>
      <Migas items={items} />
    </MemoryRouter>,
  );
}

describe("Migas", () => {
  it("pinta cada nivel salvo el último como link, con chevrones entre ellos", () => {
    montar([
      { label: "Inicio", to: "/" },
      { label: "Productos", to: "/coleccion" },
      { label: "Set de cuchillos" },
    ]);

    const nav = screen.getByRole("navigation", { name: "Miga de pan" });
    expect(within(nav).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Productos" })).toHaveAttribute("href", "/coleccion");
    expect(within(nav).getAllByText("chevron_right")).toHaveLength(2);
  });

  it("el último nivel es texto plano, marcado como la página actual", () => {
    montar([{ label: "Inicio", to: "/" }, { label: "Set de cuchillos" }]);

    const actual = screen.getByText("Set de cuchillos");
    expect(actual.tagName).not.toBe("A");
    expect(actual).toHaveAttribute("aria-current", "page");
  });

  it("el último nivel trunca en una sola línea, para un nombre largo en mobile", () => {
    montar([{ label: "Inicio", to: "/" }, { label: "Un nombre de producto extremadamente largo" }]);

    expect(screen.getByText("Un nombre de producto extremadamente largo")).toHaveClass("truncate");
  });

  it("sin items no renderiza nada", () => {
    const { container } = montar([]);

    expect(container).toBeEmptyDOMElement();
  });
});
