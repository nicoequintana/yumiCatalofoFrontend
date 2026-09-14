import { describe, expect, it, vi } from "vitest";
import { alCambiarSesion, notificarCambioSesion } from "./eventosSesion.js";

describe("eventosSesion", () => {
  it("notificarCambioSesion llama a los listeners suscriptos", () => {
    const listener = vi.fn();
    alCambiarSesion(listener);

    notificarCambioSesion();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("alCambiarSesion devuelve una función para desuscribirse", () => {
    const listener = vi.fn();
    const desuscribir = alCambiarSesion(listener);

    desuscribir();
    notificarCambioSesion();

    expect(listener).not.toHaveBeenCalled();
  });

  it("notificarCambioSesion sin listeners suscriptos no lanza", () => {
    expect(() => notificarCambioSesion()).not.toThrow();
  });
});
