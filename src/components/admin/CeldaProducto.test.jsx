import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CeldaProducto from "./CeldaProducto.jsx";

/**
 * La celda de identidad de un producto en las tablas y listas del panel.
 *
 * Lo que se fija acá es el CONTRATO visible: nombre, SKU, portada cuando la hay
 * y la marca de oculto. Nació inline en `TablaComercial` y la vitrina de una
 * campaña necesitaba exactamente lo mismo — sin este componente serían dos
 * markups que divergen sin que nada falle.
 */
describe("CeldaProducto", () => {
  it("muestra el nombre y el sku", () => {
    render(<CeldaProducto nombre="Lámpara" sku="YIM-0001" fotoPortada={null} visibleEnCatalogo />);

    expect(screen.getByText("Lámpara")).toBeInTheDocument();
    expect(screen.getByText("YIM-0001")).toBeInTheDocument();
  });

  it("pinta la portada cuando la hay, decorativa", () => {
    const { container } = render(
      <CeldaProducto
        nombre="Lámpara"
        sku="YIM-0001"
        fotoPortada="https://cdn.test/foto.jpg"
        visibleEnCatalogo
      />,
    );

    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "https://cdn.test/foto.jpg");
    // `alt=""`: el nombre ya está al lado como texto, un alt lo duplicaría.
    expect(img).toHaveAttribute("alt", "");
  });

  it("sin portada muestra el marcador y ninguna imagen", () => {
    const { container } = render(
      <CeldaProducto nombre="Lámpara" sku="YIM-0001" fotoPortada={null} visibleEnCatalogo />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("image")).toBeInTheDocument();
  });

  it("marca el producto oculto junto al sku", () => {
    render(
      <CeldaProducto
        nombre="Lámpara"
        sku="YIM-0001"
        fotoPortada={null}
        visibleEnCatalogo={false}
      />,
    );

    expect(screen.getByText(/YIM-0001 · oculto/)).toBeInTheDocument();
  });

  it("un producto visible no lleva ninguna marca", () => {
    render(<CeldaProducto nombre="Lámpara" sku="YIM-0001" fotoPortada={null} visibleEnCatalogo />);

    expect(screen.queryByText(/oculto/)).toBeNull();
  });
});
