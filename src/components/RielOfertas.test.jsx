import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const ofertasMock = vi.fn();

vi.mock("../hooks/useOfertas.js", () => ({
  default: (...args) => ofertasMock(...args),
}));

const { default: RielOfertas } = await import("./RielOfertas.jsx");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RielOfertas", () => {
  it("sin ofertas y sin error, no renderiza nada", () => {
    ofertasMock.mockReturnValue({ productos: [], error: null });

    const { container } = render(<RielOfertas />, { wrapper: MemoryRouter });

    expect(container).toBeEmptyDOMElement();
  });

  it("con error muestra EstadoVacio con cloud_off y el mensaje compartido", () => {
    ofertasMock.mockReturnValue({ productos: [], error: "Revisá tu conexión e intentá de nuevo." });

    render(<RielOfertas />, { wrapper: MemoryRouter });

    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar las ofertas")).toBeInTheDocument();
  });
});
