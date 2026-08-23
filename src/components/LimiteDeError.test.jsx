import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LimiteDeError from "./LimiteDeError.jsx";

function Explota() {
  throw new Error("boom de render");
}

/**
 * React reporta por `console.error` todo error atrapado por un límite, además
 * de lo que loguea el propio `componentDidCatch`. Se silencia SOLO en este
 * archivo (y se restaura después) para que la salida de la suite siga siendo
 * legible; el espía se sigue inspeccionando, así que un fallo real no queda
 * tapado.
 */
let espiaConsola;

beforeEach(() => {
  espiaConsola = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  espiaConsola.mockRestore();
});

describe("LimiteDeError", () => {
  it("renderiza sus hijos mientras no hay error", () => {
    render(
      <LimiteDeError>
        <p>contenido sano</p>
      </LimiteDeError>,
    );

    expect(screen.getByText("contenido sano")).toBeInTheDocument();
  });

  it("muestra la pantalla de recuperación en vez de propagar el error", () => {
    render(
      <LimiteDeError>
        <Explota />
      </LimiteDeError>,
    );

    const aviso = screen.getByRole("alert");
    expect(aviso).toHaveTextContent(/algo se rompió de nuestro lado/i);
    // Lo que ve un cliente real: una acción concreta, nunca el stack trace.
    expect(screen.getByRole("button", { name: /recargar la página/i })).toBeInTheDocument();
    expect(aviso).not.toHaveTextContent(/boom de render/);
  });

  it("reporta el error por consola con el componente donde se rompió", () => {
    render(
      <LimiteDeError>
        <Explota />
      </LimiteDeError>,
    );

    const reporte = espiaConsola.mock.calls.find(
      ([mensaje]) => mensaje === "Error no controlado en el árbol de React:",
    );

    expect(reporte).toBeDefined();
    expect(reporte[1]).toBeInstanceOf(Error);
    expect(reporte[1].message).toBe("boom de render");
    expect(reporte[2]).toContain("Explota");
  });

  it("usa el fallback recibido por props cuando se le pasa uno", () => {
    render(
      <LimiteDeError fallback={<p>fallback del admin</p>}>
        <Explota />
      </LimiteDeError>,
    );

    expect(screen.getByText("fallback del admin")).toBeInTheDocument();
    expect(screen.queryByText(/algo se rompió de nuestro lado/i)).not.toBeInTheDocument();
  });

  it("recarga la página al tocar el botón de recuperación", async () => {
    const recargar = vi.fn();
    // `window.location.reload` no es escribible en jsdom; se reemplaza el
    // objeto entero y se restaura al terminar.
    const locationOriginal = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...locationOriginal, reload: recargar },
    });

    try {
      const user = userEvent.setup();
      render(
        <LimiteDeError>
          <Explota />
        </LimiteDeError>,
      );

      await user.click(screen.getByRole("button", { name: /recargar la página/i }));

      expect(recargar).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: locationOriginal,
      });
    }
  });

  it("vuelve a intentar renderizar cuando cambia la clave de reinicio", () => {
    const { rerender } = render(
      <LimiteDeError claveDeReinicio="/pantalla-rota">
        <Explota />
      </LimiteDeError>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    // Equivale a navegar a otra pantalla del admin: sin esto el fallback
    // quedaría pegado, porque un límite de error no se resetea solo.
    rerender(
      <LimiteDeError claveDeReinicio="/otra-pantalla">
        <p>pantalla sana</p>
      </LimiteDeError>,
    );

    expect(screen.getByText("pantalla sana")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mantiene el fallback mientras la clave de reinicio no cambia", () => {
    const { rerender } = render(
      <LimiteDeError claveDeReinicio="/pantalla-rota">
        <Explota />
      </LimiteDeError>,
    );

    rerender(
      <LimiteDeError claveDeReinicio="/pantalla-rota">
        <p>pantalla sana</p>
      </LimiteDeError>,
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText("pantalla sana")).not.toBeInTheDocument();
  });
});
