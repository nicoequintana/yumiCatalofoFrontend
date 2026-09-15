import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductosDeCombo from "./ProductosDeCombo.jsx";

describe("ProductosDeCombo", () => {
  it("lista los productos del combo, con la cantidad solo si es mayor a 1", () => {
    render(
      <ProductosDeCombo
        productos={[
          { nombreProducto: "Lámpara", cantidad: 2 },
          { nombreProducto: "Mesa", cantidad: 1 },
        ]}
      />,
    );
    expect(screen.getByText("2× Lámpara · Mesa")).toBeInTheDocument();
  });
});
