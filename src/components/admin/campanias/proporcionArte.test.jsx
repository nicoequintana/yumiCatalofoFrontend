import { describe, expect, it } from "vitest";
import {
  MEDIDA_SUGERIDA,
  RATIO_SLIDE,
  avisoProporcionArte,
  recorteVertical,
} from "./proporcionArte.js";

/**
 * Guard del aviso de proporción del arte del slide.
 *
 * Existe por un caso real del 06/09/2026: se subió un arte de 1254×1254 y en la
 * home se veía una tira del centro, porque `object-cover` sobre una caja de
 * 3,6:1 le recorta el 72 % del alto. El CSS estaba bien; lo que faltaba era que
 * el panel lo dijera.
 */
describe("recorteVertical", () => {
  it("un arte cuadrado pierde ~72 % del alto en la caja de 3,6:1", () => {
    // 1 − 1/3,6 = 0,722
    expect(recorteVertical(1)).toBe(72);
  });

  it("un arte de 2,5:1 —el otro caso real— pierde ~31 %", () => {
    expect(recorteVertical(2.5)).toBe(31);
  });

  it("un arte que YA tiene el ratio de la caja no pierde nada", () => {
    expect(recorteVertical(RATIO_SLIDE)).toBe(0);
  });

  it("un arte MÁS apaisado que la caja tampoco pierde alto", () => {
    // Pierde ancho, que es lo que casi nunca molesta: el copy vive en el
    // tercio izquierdo, que es la zona segura de los dos breakpoints.
    expect(recorteVertical(5)).toBe(0);
  });

  it("no explota con medidas inválidas", () => {
    expect(recorteVertical(0)).toBe(0);
    expect(recorteVertical(null)).toBe(0);
    expect(recorteVertical(-2)).toBe(0);
  });
});

describe("avisoProporcionArte", () => {
  it("avisa sobre un arte cuadrado, con el porcentaje real y la medida sugerida", () => {
    const aviso = avisoProporcionArte(1254, 1254);

    expect(aviso).toContain("cuadrada");
    expect(aviso).toContain("72 %");
    expect(aviso).toContain(MEDIDA_SUGERIDA);
  });

  it("avisa sobre un arte vertical y NO lo llama cuadrado", () => {
    const aviso = avisoProporcionArte(800, 1200);

    expect(aviso).toContain("más alta que ancha");
    expect(aviso).not.toContain("cuadrada");
  });

  it("NO avisa sobre un arte apaisado de 3,6:1", () => {
    expect(avisoProporcionArte(1800, 500)).toBeNull();
  });

  it("NO avisa sobre uno pensado para móvil (2,9:1)", () => {
    // Recorta algo en escritorio, pero es una pieza legítima: el aviso persigue
    // la que NO fue diseñada para una franja, no la que se diseñó para el otro
    // breakpoint.
    expect(avisoProporcionArte(1450, 500)).toBeNull();
  });

  it("NO avisa sobre el arte real de 2,5:1, que está en el borde", () => {
    // 1983×793 — recorta un 31 %, molesto pero no roto. El umbral es 2,4.
    expect(avisoProporcionArte(1983, 793)).toBeNull();
  });

  it("no explota sin medidas", () => {
    expect(avisoProporcionArte(0, 0)).toBeNull();
    expect(avisoProporcionArte(null, null)).toBeNull();
  });
});
