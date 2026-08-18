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

// Product-decision correction: no real stock-management workflow exists yet,
// so the "Agotado" badge must not be visible on the public catalog for any
// `disponibilidad` value (see Badge.jsx's doc comment).
describe("ProductCard - badge de Agotado (oculto por decisión de producto)", () => {
  it("no muestra el badge Agotado cuando el producto está disponible", () => {
    renderCard(PRODUCTO_BASE);
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });

  it("no muestra el badge Agotado aunque disponibilidad sea AGOTADO (variant vertical)", () => {
    renderCard({ ...PRODUCTO_BASE, disponibilidad: "AGOTADO" });
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });

  it("no muestra el badge Agotado en variant horizontal tampoco", () => {
    renderCard({ ...PRODUCTO_BASE, disponibilidad: "AGOTADO" }, "horizontal");
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });

  it("no muestra el badge para A_PEDIDO", () => {
    renderCard({ ...PRODUCTO_BASE, disponibilidad: "A_PEDIDO" });
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
  });
});
