import { describe, it, expect } from "vitest";
import {
  ESTADOS_PRECIO,
  calcularPrecio,
  redondearAEntero,
  estadoDePrecio,
} from "./precios.js";

/**
 * ⚠️ Este set de casos es ESPEJO de `backend/src/lib/precios.test.js`.
 *
 * Los dos repos se publican por separado, así que no hay forma de compararlos
 * en la misma corrida: la única defensa contra la divergencia es que los dos
 * archivos afirmen sobre la MISMA tabla de números. Si acá se agrega un caso,
 * va también del otro lado.
 *
 * Lo que se protege no es cosmético: si las dos copias divergen, la pantalla de
 * precios le muestra al admin un número distinto del que el backend escribe al
 * aplicar, sin error y sin nada que lo delate.
 */
describe("redondearAEntero", () => {
  it("redondea al peso más cercano", () => {
    expect(redondearAEntero(6303.75)).toBe(6304);
    expect(redondearAEntero(29733.2)).toBe(29733);
    expect(redondearAEntero(16810)).toBe(16810);
  });

  it("el medio peso exacto redondea hacia arriba", () => {
    expect(redondearAEntero(6457.5)).toBe(6458);
    expect(redondearAEntero(0.5)).toBe(1);
  });
});

describe("calcularPrecio", () => {
  // Misma tabla que el backend. Es el contrato de la feature.
  const casos = [
    { costo: "14504", coeficiente: "2.05", esperado: 29733 },
    { costo: "10000", coeficiente: "2.05", esperado: 20500 },
    { costo: "8200", coeficiente: "2.05", esperado: 16810 },
    { costo: "3150", coeficiente: "2.05", esperado: 6458 },
    { costo: "22900", coeficiente: "2.05", esperado: 46945 },
    // El caso que motivó el cambio de regla (29/08/2026).
    { costo: "3075", coeficiente: "2.05", esperado: 6304 },
  ];

  for (const { costo, coeficiente, esperado } of casos) {
    it(`${costo} × ${coeficiente} = ${esperado}`, () => {
      expect(calcularPrecio(costo, coeficiente)).toBe(esperado);
    });
  }

  it("con coeficiente 1 devuelve el costo tal cual", () => {
    expect(calcularPrecio("14504", "1")).toBe(14504);
    expect(calcularPrecio("20500", "1")).toBe(20500);
  });

  // El motivo de que este módulo use aritmética entera: un valor que cae sobre
  // el medio peso exacto es el que más sufre la representación en float.
  it("no arrastra error de punto flotante", () => {
    expect(calcularPrecio(10000, 2.05)).toBe(20500);
    expect(calcularPrecio(3150, 2.05)).toBe(6458);
    expect(calcularPrecio(20000, 2.05)).toBe(41000);
    expect(calcularPrecio(40000, 2.05)).toBe(82000);
  });

  // El admin tipea "2,05", no "2.05".
  it("acepta coma como separador decimal", () => {
    expect(calcularPrecio("14504", "2,05")).toBe(29733);
  });

  it("devuelve null si falta el costo o el coeficiente", () => {
    expect(calcularPrecio(null, "2.05")).toBeNull();
    expect(calcularPrecio("14504", null)).toBeNull();
    expect(calcularPrecio("", "")).toBeNull();
    expect(calcularPrecio(undefined, undefined)).toBeNull();
  });

  it("devuelve null ante valores no positivos", () => {
    expect(calcularPrecio("0", "2.05")).toBeNull();
    expect(calcularPrecio("14504", "0")).toBeNull();
    expect(calcularPrecio("-100", "2.05")).toBeNull();
  });
});

describe("estadoDePrecio", () => {
  it("es SIN_COSTO cuando falta costo o coeficiente", () => {
    expect(estadoDePrecio({ precio: "12000", costo: null, coeficiente: "2.05" })).toBe(
      ESTADOS_PRECIO.SIN_COSTO,
    );
    expect(estadoDePrecio({ precio: "12000", costo: "5000", coeficiente: null })).toBe(
      ESTADOS_PRECIO.SIN_COSTO,
    );
  });

  it("es AL_DIA cuando el precio publicado coincide con el cálculo", () => {
    expect(estadoDePrecio({ precio: "29733", costo: "14504", coeficiente: "2.05" })).toBe(
      ESTADOS_PRECIO.AL_DIA,
    );
  });

  it("es DIFIERE cuando el precio publicado es otro", () => {
    // Subió el costo y todavía no se aplicó.
    expect(estadoDePrecio({ precio: "29733", costo: "15200", coeficiente: "2.05" })).toBe(
      ESTADOS_PRECIO.DIFIERE,
    );
    // El admin pisó el precio a mano: también DIFIERE, y está bien que así sea.
    expect(estadoDePrecio({ precio: "18900", costo: "10000", coeficiente: "2.05" })).toBe(
      ESTADOS_PRECIO.DIFIERE,
    );
  });

  it("compara por valor, no por representación", () => {
    expect(estadoDePrecio({ precio: "20500.00", costo: "10000", coeficiente: "2.05" })).toBe(
      ESTADOS_PRECIO.AL_DIA,
    );
  });
});
