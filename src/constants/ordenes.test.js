import { describe, expect, it } from "vitest";
import { ESTILOS_ESTADO, ESTILO_ESTADO_POR_DEFECTO } from "./ordenes.js";

/**
 * Este archivo testeaba "el espejo exacto de lib/estadosOrden.js del backend".
 * Ese espejo YA NO EXISTE a propósito: lo semántico (lista, etiquetas,
 * terminales) viene del backend — `estadoEtiqueta` en cada orden y
 * `GET /ordenes/estados` para los selects. Acá quedó solo la presentación.
 */
describe("estilos de estado de orden", () => {
  it("cubre los cuatro estados del modelo", () => {
    // `.sort()` es lexicográfico: la "T" de ENTREGADA va antes que el "_" de
    // EN_PREPARACION.
    expect(Object.keys(ESTILOS_ESTADO).sort()).toEqual([
      "CANCELADA",
      "ENTREGADA",
      "EN_PREPARACION",
      "PENDIENTE",
    ]);
  });

  it("cada estilo es una cadena de clases no vacía", () => {
    for (const clases of Object.values(ESTILOS_ESTADO)) {
      expect(clases.length).toBeGreaterThan(0);
    }
    expect(ESTILO_ESTADO_POR_DEFECTO.length).toBeGreaterThan(0);
  });

  it("no queda rastro de CONFIRMADA", () => {
    expect(ESTILOS_ESTADO).not.toHaveProperty("CONFIRMADA");
  });
});
