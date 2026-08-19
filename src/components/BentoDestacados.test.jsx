import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BentoDestacados from "./BentoDestacados.jsx";

function renderComponente(productos) {
  return render(
    <MemoryRouter>
      <BentoDestacados productos={productos} />
    </MemoryRouter>,
  );
}

describe("BentoDestacados", () => {
  it("no renderiza nada si hay menos de 4 productos destacados", () => {
    const productos = [
      { id: 1, nombre: "A", destacado: true, precio: "100", etiqueta: null, fotos: [] },
      { id: 2, nombre: "B", destacado: true, precio: "200", etiqueta: null, fotos: [] },
      { id: 3, nombre: "C", destacado: false, precio: "300", etiqueta: null, fotos: [] },
    ];
    const { container } = renderComponente(productos);
    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada si no hay productos", () => {
    const { container } = renderComponente([]);
    expect(container).toBeEmptyDOMElement();
  });
});
