import { describe, it, expect } from "vitest";
import {
  ESTADOS_PRECIO,
  calcularPrecio,
  redondearACentenaArriba,
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
describe("redondearACentenaArriba", () => {
  it("sube al siguiente múltiplo de 100", () => {
    expect(redondearACentenaArriba(29733.2)).toBe(29800);
    expect(redondearACentenaArriba(6457.5)).toBe(6500);
    expect(redondearACentenaArriba(16810)).toBe(16900);
  });

  it("deja quieto un valor que ya es múltiplo de 100", () => {
    expect(redondearACentenaArriba(20500)).toBe(20500);
    expect(redondearACentenaArriba(100)).toBe(100);
  });
});

describe("calcularPrecio", () => {
  // Misma tabla que el backend. Es el contrato de la feature.
  const casos = [
    { costo: "14504", coeficiente: "2.05", esperado: 29800 },
    { costo: "10000", coeficiente: "2.05", esperado: 20500 },
    { costo: "8200", coeficiente: "2.05", esperado: 16900 },
    { costo: "3150", coeficiente: "2.05", esperado: 6500 },
    { costo: "22900", coeficiente: "2.05", esperado: 47000 },
  ];

  for (const { costo, coeficiente, esperado } of casos) {
    it(`${costo} × ${coeficiente} = ${esperado}`, () => {
      expect(calcularPrecio(costo, coeficiente)).toBe(esperado);
    });
  }

  it("con coeficiente 1 devuelve el costo redondeado", () => {
    expect(calcularPrecio("14504", "1")).toBe(14600);
    expect(calcularPrecio("20500", "1")).toBe(20500);
  });

  // El motivo de que este módulo use aritmética entera. `14504 * 2.05` en float
  // da 29733.200000000004, y `10000 * 2.05` puede dar 20500.000000000004 — que
  // redondeado hacia arriba a la centena daría 20600, cien pesos de más.
  it("no arrastra error de punto flotante", () => {
    expect(calcularPrecio(10000, 2.05)).toBe(20500);
    expect(calcularPrecio(20000, 2.05)).toBe(41000);
    expect(calcularPrecio(40000, 2.05)).toBe(82000);
  });

  // El admin tipea "2,05", no "2.05".
  it("acepta coma como separador decimal", () => {
    expect(calcularPrecio("14504", "2,05")).toBe(29800);
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
    expect(estadoDePrecio({ precio: "29800", costo: "14504", coeficiente: "2.05" })).toBe(
      ESTADOS_PRECIO.AL_DIA,
    );
  });

  it("es DIFIERE cuando el precio publicado es otro", () => {
    // Subió el costo y todavía no se aplicó.
    expect(estadoDePrecio({ precio: "29800", costo: "15200", coeficiente: "2.05" })).toBe(
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
