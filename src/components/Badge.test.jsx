import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "./Badge.jsx";

describe("Badge", () => {
  it("no renderiza nada sin etiqueta", () => {
    const { container } = render(<Badge etiqueta={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("pinta con el color que manda el backend", () => {
    render(
      <Badge
        etiqueta={{ id: 1, nombre: "Nuevo", colorFondo: "46 125 50", colorTexto: "255 255 255" }}
      />,
    );

    const chip = screen.getByText("Nuevo");
    expect(chip).toHaveStyle({ backgroundColor: "rgb(46, 125, 50)" });
    expect(chip).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  // `colorFondo: null` significa "como siempre", no "dato faltante".
  it("sin color cae al token de siempre y no emite style", () => {
    render(<Badge etiqueta={{ id: 1, nombre: "Nuevo", colorFondo: null, colorTexto: null }} />);

    const chip = screen.getByText("Nuevo");
    expect(chip.getAttribute("style")).toBeFalsy();
    expect(chip.className).toContain("bg-tertiary");
    expect(chip.className).toContain("text-on-tertiary");
  });
});
