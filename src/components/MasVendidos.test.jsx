import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import MasVendidos from "./MasVendidos.jsx";

function Proveedores({ children }) {
  return (
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  );
}

function producto(extra = {}) {
  return { id: 1, nombre: "Reloj Clásico", precio: "1000", stock: 5, fotos: [], etiqueta: null, categoria: null, ...extra };
}

describe("MasVendidos", () => {
  it("no renderiza con menos de 4 productos", () => {
    const { container } = render(
      <MasVendidos productos={[producto(), producto({ id: 2 })]} error={null} />,
      { wrapper: Proveedores },
    );

    expect(screen.queryByText("Más vendidos")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("sin props tampoco renderiza nada", () => {
    const { container } = render(<MasVendidos />, { wrapper: Proveedores });

    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza la grilla con 4 o más", () => {
    const productos = [1, 2, 3, 4].map((id) => producto({ id, nombre: `Producto ${id}` }));

    render(<MasVendidos productos={productos} error={null} />, { wrapper: Proveedores });

    expect(screen.getByRole("heading", { level: 2, name: "Más vendidos" })).toBeInTheDocument();
    expect(screen.getByText("Producto 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver catálogo/i })).toHaveAttribute("href", "/coleccion");
  });

  it("distingue error de vacío", () => {
    render(<MasVendidos productos={[]} error="Revisá tu conexión e intentá de nuevo." />, {
      wrapper: Proveedores,
    });

    expect(screen.getByText(/revisá tu conexión/i)).toBeInTheDocument();
    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar los más vendidos")).toBeInTheDocument();
  });
});
