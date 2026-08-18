import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProductCard from "./ProductCard.jsx";

const PRODUCTO_BASE = {
  id: 1,
  nombre: "Reloj Clásico",
  precio: "1000",
  etiqueta: null,
  categoria: null,
  fotos: [],
  disponibilidad: "DISPONIBLE",
};

function renderCard(producto, variant) {
  return render(
    <MemoryRouter>
      <ProductCard producto={producto} variant={variant} />
    </MemoryRouter>,
  );
}

describe("ProductCard - badge de Agotado", () => {
  it("no muestra el badge Agotado cuando el producto está disponible", () => {
    renderCard(PRODUCTO_BASE);
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });

  it("muestra el badge Agotado cuando disponibilidad es AGOTADO (variant vertical)", () => {
    renderCard({ ...PRODUCTO_BASE, disponibilidad: "AGOTADO" });
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });

  it("muestra el badge Agotado en variant horizontal también", () => {
    renderCard({ ...PRODUCTO_BASE, disponibilidad: "AGOTADO" }, "horizontal");
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });

  it("no muestra el badge para A_PEDIDO (solo AGOTADO lo dispara)", () => {
    renderCard({ ...PRODUCTO_BASE, disponibilidad: "A_PEDIDO" });
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });
});
