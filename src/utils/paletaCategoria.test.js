import { describe, expect, it } from "vitest";
import { FAMILIAS_CATEGORIA, colorParaSlug } from "./paletaCategoria.js";

describe("colorParaSlug", () => {
  it("el mismo slug siempre da la misma familia", () => {
    expect(colorParaSlug("cocina")).toEqual(colorParaSlug("cocina"));
  });

  it("devuelve el nombre de una familia definida en la paleta", () => {
    expect(FAMILIAS_CATEGORIA).toContain(colorParaSlug("hogar"));
  });

  it("hay más de una familia en la paleta (6 a 8 matices, como el mockup)", () => {
    expect(FAMILIAS_CATEGORIA.length).toBeGreaterThanOrEqual(6);
    expect(FAMILIAS_CATEGORIA.length).toBeLessThanOrEqual(8);
  });

  it("NO devuelve un triple de canales — los valores viven solo en index.css", () => {
    // Regresión: la versión anterior devolvía { from, to } con RGB literal.
    // Duplicar los números acá es exactamente lo que la review de T13 pidió
    // eliminar — el componente arma `rgb(var(--circulo-<familia>-<canal>))`.
    expect(typeof colorParaSlug("hogar")).toBe("string");
  });
});
