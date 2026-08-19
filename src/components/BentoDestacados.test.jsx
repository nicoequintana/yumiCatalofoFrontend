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

  it("renderiza 4 celdas cuando hay al menos 4 destacados, cada una como link al producto", () => {
    const productos = [
      { id: 1, nombre: "Set de Café", destacado: true, precio: "1000", etiqueta: "Nuevo", fotos: [{ url: "http://x/1.jpg" }] },
      { id: 2, nombre: "Organizador Focus", destacado: true, precio: "4500", etiqueta: null, fotos: [{ url: "http://x/2.jpg" }] },
      { id: 3, nombre: "Lámpara Aura", destacado: true, precio: "8900", etiqueta: null, fotos: [{ url: "http://x/3.jpg" }] },
      { id: 4, nombre: "Kit Regalo", destacado: true, precio: "3200", etiqueta: "Exclusivo", fotos: [{ url: "http://x/4.jpg" }] },
      { id: 5, nombre: "No destacado", destacado: false, precio: "100", etiqueta: null, fotos: [] },
    ];
    renderComponente(productos);

    expect(screen.getByText("Hallazgos del día")).toBeInTheDocument();
    expect(screen.getByText("Set de Café")).toBeInTheDocument();
    expect(screen.getByText("Organizador Focus")).toBeInTheDocument();
    expect(screen.getByText("Lámpara Aura")).toBeInTheDocument();
    expect(screen.getByText("Kit Regalo")).toBeInTheDocument();
    expect(screen.queryByText("No destacado")).not.toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links[0]).toHaveAttribute("href", "/producto/1");
  });

  it("solo muestra el badge de etiqueta cuando el producto la tiene", () => {
    const productos = [
      { id: 1, nombre: "A", destacado: true, precio: "100", etiqueta: "Nuevo", fotos: [] },
      { id: 2, nombre: "B", destacado: true, precio: "200", etiqueta: null, fotos: [] },
      { id: 3, nombre: "C", destacado: true, precio: "300", etiqueta: null, fotos: [] },
      { id: 4, nombre: "D", destacado: true, precio: "400", etiqueta: null, fotos: [] },
    ];
    renderComponente(productos);

    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });
});
