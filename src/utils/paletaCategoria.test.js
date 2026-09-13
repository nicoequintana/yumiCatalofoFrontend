import { describe, expect, it } from "vitest";
import { PALETA_CATEGORIA, colorParaSlug } from "./paletaCategoria.js";

describe("colorParaSlug", () => {
  it("el mismo slug siempre da el mismo color", () => {
    expect(colorParaSlug("cocina")).toEqual(colorParaSlug("cocina"));
  });

  it("devuelve un par from/to en canales, no en hex", () => {
    const color = colorParaSlug("hogar");
    expect(color.from).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    expect(color.to).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
  });

  it("dos slugs distintos pueden (no necesariamente) caer en colores distintos, pero la paleta tiene más de un color", () => {
    expect(PALETA_CATEGORIA.length).toBeGreaterThan(3);
  });
});
