import { describe, expect, it } from "vitest";
import { escalaParaAncho, medidasDelMarco } from "./escalaLienzo.js";

describe("escalaParaAncho", () => {
  it("achica la tienda de escritorio para que entre en la columna", () => {
    expect(escalaParaAncho(680, 1280)).toBe(0.53125);
  });

  it("nunca agranda: el celular en una columna ancha queda a tamaño real", () => {
    expect(escalaParaAncho(680, 390)).toBe(1);
  });

  it("sin ancho medido (antes del primer layout) no escala", () => {
    expect(escalaParaAncho(0, 1280)).toBe(1);
    expect(escalaParaAncho(680, 0)).toBe(1);
  });
});

describe("medidasDelMarco", () => {
  it("sin tope, el iframe mide lo que el contenido y el marco su versión escalada", () => {
    expect(medidasDelMarco({ altoContenido: 500, escala: 0.5, altoMaximo: null })).toEqual({ altoMarco: 250, altoIframe: 500 });
  });

  it("con tope y contenido largo, el marco se corta y el iframe es un viewport de ese alto real", () => {
    // 700 px visibles a escala 0.5 = 1400 px de viewport de la tienda.
    expect(medidasDelMarco({ altoContenido: 3000, escala: 0.5, altoMaximo: 700 })).toEqual({ altoMarco: 700, altoIframe: 1400 });
  });

  it("con tope y contenido corto, manda el contenido", () => {
    expect(medidasDelMarco({ altoContenido: 400, escala: 1, altoMaximo: 700 })).toEqual({ altoMarco: 400, altoIframe: 400 });
  });
});
