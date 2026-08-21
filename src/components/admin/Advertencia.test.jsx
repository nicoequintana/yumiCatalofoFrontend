import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Advertencia from "./Advertencia.jsx";

describe("Advertencia", () => {
  it("anuncia el aviso sin robar el foco", () => {
    render(
      <Advertencia titulo="Algo que aclarar">
        <p>Un detalle.</p>
      </Advertencia>,
    );

    // `role="status"` y no `role="alert"`: es una aclaración sobre los números
    // que ya están en pantalla, no una interrupción urgente.
    const aviso = screen.getByRole("status");
    expect(within(aviso).getByText("Algo que aclarar")).toBeInTheDocument();
    expect(within(aviso).getByText("Un detalle.")).toBeInTheDocument();
  });

  it("expone el `testId` que le pase la pantalla", () => {
    render(
      <Advertencia titulo="Título" testId="advertencia-cualquiera">
        <p>Cuerpo.</p>
      </Advertencia>,
    );

    expect(screen.getByTestId("advertencia-cualquiera")).toBeInTheDocument();
  });

  it("usa el ícono de advertencia salvo que se pida otro", () => {
    const { rerender } = render(
      <Advertencia titulo="Título">
        <p>Cuerpo.</p>
      </Advertencia>,
    );

    expect(screen.getByText("warning")).toBeInTheDocument();

    rerender(
      <Advertencia titulo="Título" icono="schedule">
        <p>Cuerpo.</p>
      </Advertencia>,
    );

    expect(screen.getByText("schedule")).toBeInTheDocument();
    expect(screen.queryByText("warning")).not.toBeInTheDocument();
  });
});
