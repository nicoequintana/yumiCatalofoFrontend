import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import GrillaCombos from "./GrillaCombos.jsx";

describe("GrillaCombos", () => {
  it("es la grilla de /combos: filas iguales, 2 columnas desde md y la clase que centra la impar", () => {
    render(
      <GrillaCombos>
        <p>uno</p>
      </GrillaCombos>,
    );
    const grilla = screen.getByText("uno").parentElement;
    expect(grilla).toHaveClass("grilla-combos", "grid", "auto-rows-fr", "grid-cols-1", "md:grid-cols-2");
  });
});
