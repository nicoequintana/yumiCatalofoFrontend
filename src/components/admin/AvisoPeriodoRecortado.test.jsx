import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AvisoPeriodoRecortado from "./AvisoPeriodoRecortado.jsx";

const PERIODO_RECORTADO = {
  desde: "2025-07-17",
  hasta: "2026-08-19",
  recortado: true,
};

describe("AvisoPeriodoRecortado", () => {
  it("no muestra nada cuando el período no se recortó", () => {
    const { container } = render(
      <AvisoPeriodoRecortado
        periodo={{ desde: "2026-07-21", hasta: "2026-08-19", recortado: false }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("no rompe si la respuesta no trae `periodo` (backend viejo)", () => {
    // Frontend y backend se despliegan desde repos separados: una respuesta
    // sin `periodo` tiene que dar aviso vacío, nunca un crash de la pantalla.
    const { container, rerender } = render(<AvisoPeriodoRecortado periodo={undefined} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<AvisoPeriodoRecortado periodo={null} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<AvisoPeriodoRecortado />);
    expect(container).toBeEmptyDOMElement();
  });

  it("avisa que el rango pedido superó el máximo y nombra la ventana real", () => {
    render(<AvisoPeriodoRecortado periodo={PERIODO_RECORTADO} />);

    const aviso = screen.getByTestId("advertencia-periodo-recortado");

    expect(
      within(aviso).getByText("El período mostrado no es el que pediste"),
    ).toBeInTheDocument();
    expect(within(aviso).getByText(/supera el máximo/i)).toBeInTheDocument();
    // La ventana efectivamente medida, en el formato de fecha de la app.
    expect(within(aviso).getByText(/17\/07\/2025/)).toBeInTheDocument();
    expect(within(aviso).getByText(/19\/08\/2026/)).toBeInTheDocument();
  });

  it("avisa igual aunque el período no traiga las fechas", () => {
    render(<AvisoPeriodoRecortado periodo={{ recortado: true }} />);

    const aviso = screen.getByTestId("advertencia-periodo-recortado");

    expect(within(aviso).getByText(/supera el máximo/i)).toBeInTheDocument();
    // Sin fechas no se inventa un rango: se dice que la ventana es más corta
    // y punto.
    expect(within(aviso).getByText(/ventana más corta/i)).toBeInTheDocument();
  });
});
