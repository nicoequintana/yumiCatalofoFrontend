import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PanelPreview from "./PanelPreview.jsx";

const PRODUCTO = { nombre: "Producto de prueba", precio: "1000", stock: 5 };

function montar(extra = {}) {
  return render(
    <PanelPreview
      producto={PRODUCTO}
      visible
      plantillaCompleta={false}
      onAlternarPlantilla={() => {}}
      anchoPreview="desktop"
      onCambiarAncho={() => {}}
      {...extra}
    />,
  );
}

describe("PanelPreview", () => {
  it("el selector escritorio/móvil solo existe desde lg", () => {
    montar();

    // Por debajo de `lg` el preview ocupa toda la columna como pestaña —
    // alternar "ancho escritorio/móvil" no tiene sentido ahí, solo sirve
    // cuando el preview convive al lado del formulario.
    const botonEscritorio = screen.getByRole("button", { name: "Vista escritorio" });
    const contenedor = botonEscritorio.closest("div");

    expect(contenedor).toHaveClass("hidden");
    expect(contenedor).toHaveClass("lg:flex");
  });
});
