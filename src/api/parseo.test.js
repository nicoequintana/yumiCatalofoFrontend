import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { parsearCuerpo } from "./parseo.js";
import { login } from "./auth.js";

describe("parsearCuerpo", () => {
  it("devuelve el objeto cuando el texto es JSON válido", () => {
    expect(parsearCuerpo('{"error":"Producto no encontrado."}')).toEqual({
      error: "Producto no encontrado.",
    });
  });

  it("devuelve null cuando el texto es HTML (ej. página de error de un proxy)", () => {
    expect(
      parsearCuerpo("<html><body><h1>502 Bad Gateway</h1></body></html>"),
    ).toBeNull();
  });

  it("devuelve null con string vacío", () => {
    expect(parsearCuerpo("")).toBeNull();
  });

  it("devuelve null con JSON truncado", () => {
    expect(parsearCuerpo('{"error":"corta')).toBeNull();
  });
});

describe("integración: respuesta no-JSON de un proxy caído", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("un 502 con cuerpo HTML produce el mensaje genérico, no un SyntaxError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: async () => "<html><body><h1>502 Bad Gateway</h1></body></html>",
      }),
    );

    let capturado;
    try {
      await login("admin@yima.com", "secreta");
    } catch (err) {
      capturado = err;
    }

    expect(capturado).toBeInstanceOf(Error);
    expect(capturado).not.toBeInstanceOf(SyntaxError);
    expect(capturado.message).toBe("Ocurrió un error al comunicarse con el servidor.");
  });
});
