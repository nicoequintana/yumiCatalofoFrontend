import { describe, expect, it } from "vitest";
import { iniciales } from "./iniciales.js";

describe("iniciales", () => {
  it("toma la primera letra de las dos primeras palabras, en mayúscula", () => {
    expect(iniciales("nicolás quintana gómez")).toBe("NQ");
  });

  it("una sola palabra da una sola letra", () => {
    expect(iniciales("Tito")).toBe("T");
  });

  it("un nombre vacío al recortarlo no tira: devuelve cadena vacía", () => {
    expect(iniciales(" ")).toBe("");
    expect(iniciales(null)).toBe("");
    expect(iniciales(undefined)).toBe("");
  });
});
