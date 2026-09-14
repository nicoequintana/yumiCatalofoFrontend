import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Confianza from "./Confianza.jsx";

describe("Confianza", () => {
  it("muestra las dos tarjetas fijas con el copy provisional del mockup", () => {
    render(<Confianza />);

    expect(screen.getByRole("heading", { name: "Envíos a todo el país" })).toBeInTheDocument();
    expect(
      screen.getByText("Despachamos tu pedido y te pasamos el seguimiento para que sepas dónde está."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Atención personalizada" })).toBeInTheDocument();
    expect(
      screen.getByText("Consultas antes y después de tu compra, directo por WhatsApp con nuestro equipo."),
    ).toBeInTheDocument();
  });

  it("la sección tiene un h2 visualmente oculto, para que las tarjetas h3 no cuelguen del h2 anterior", () => {
    render(<Confianza />);

    const titulo = screen.getByRole("heading", { level: 2, name: "Comprá con confianza" });
    expect(titulo).toHaveClass("sr-only");
  });

  it("no promete transportistas ni ubicaciones", () => {
    const { container } = render(<Confianza />);

    expect(container).not.toHaveTextContent(/andreani|correo argentino|oca\b|retiro en|sucursal/i);
  });
});
