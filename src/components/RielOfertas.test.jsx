import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import RielOfertas from "./RielOfertas.jsx";

/**
 * `RielOfertas` es PRESENTACIONAL desde el 07/09/2026: recibe las ofertas por
 * prop en vez de pedirlas con `useOfertas`. Por eso este archivo ya no mockea
 * ningún hook — el dato entra por la puerta de adelante. El fetch y su estado
 * de error se testean en `hooks/useOfertas.test.jsx`.
 */
describe("RielOfertas", () => {
  it("sin ofertas y sin error, no renderiza nada", () => {
    const { container } = render(<RielOfertas productos={[]} error={null} />, {
      wrapper: MemoryRouter,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("sin props tampoco renderiza nada", () => {
    // Los defaults importan: la página monta este componente en el mismo
    // render en que las ofertas todavía no llegaron.
    const { container } = render(<RielOfertas />, { wrapper: MemoryRouter });

    expect(container).toBeEmptyDOMElement();
  });

  it("con error muestra EstadoVacio con cloud_off y el mensaje compartido", () => {
    render(
      <RielOfertas productos={[]} error="Revisá tu conexión e intentá de nuevo." />,
      { wrapper: MemoryRouter },
    );

    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar las ofertas")).toBeInTheDocument();
  });

  it("con ofertas dibuja la sección y sus tarjetas", () => {
    const productos = [
      { id: 1, nombre: "Reloj Clásico", precio: "1000", fotos: [], etiqueta: null, categoria: null },
      { id: 2, nombre: "Lámpara LED", precio: "2000", fotos: [], etiqueta: null, categoria: null },
    ];

    render(<RielOfertas productos={productos} error={null} />, { wrapper: MemoryRouter });

    expect(screen.getByText("Ofertas de la semana")).toBeInTheDocument();
    expect(screen.getByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.getByText("Lámpara LED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver todas" })).toHaveAttribute(
      "href",
      "/coleccion?conDescuento=1",
    );
  });
});
