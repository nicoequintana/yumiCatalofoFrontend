import { describe, expect, it } from "vitest";
import {
  ESTADOS_ORDEN,
  ESTADOS_NO_TERMINALES,
  ETIQUETA_ESTADO,
  ESTILOS_ESTADO,
} from "./ordenes.js";

describe("constantes de orden", () => {
  it("son el espejo exacto de lib/estadosOrden.js del backend", () => {
    expect(ESTADOS_ORDEN).toEqual([
      "PENDIENTE",
      "EN_PREPARACION",
      "ENTREGADA",
      "CANCELADA",
    ]);
    expect(ESTADOS_NO_TERMINALES).toEqual(["PENDIENTE", "EN_PREPARACION"]);
  });

  it("cada estado tiene etiqueta y estilo", () => {
    for (const estado of ESTADOS_ORDEN) {
      expect(typeof ETIQUETA_ESTADO[estado]).toBe("string");
      expect(typeof ESTILOS_ESTADO[estado]).toBe("string");
    }
  });

  it("no queda rastro de CONFIRMADA", () => {
    expect(ETIQUETA_ESTADO).not.toHaveProperty("CONFIRMADA");
    expect(ESTILOS_ESTADO).not.toHaveProperty("CONFIRMADA");
  });
});
