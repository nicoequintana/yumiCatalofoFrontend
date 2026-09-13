import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import NuevosIngresos from "./NuevosIngresos.jsx";

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

describe("NuevosIngresos", () => {
  it("sin productos no renderiza nada", () => {
    const { container } = render(<NuevosIngresos productos={[]} />, { wrapper: Proveedores });

    expect(container).toBeEmptyDOMElement();
  });

  it("sin props tampoco renderiza nada", () => {
    const { container } = render(<NuevosIngresos />, { wrapper: Proveedores });

    expect(container).toBeEmptyDOMElement();
  });

  it("con productos muestra el encabezado y las tarjetas", () => {
    render(<NuevosIngresos productos={[producto(), producto({ id: 2, nombre: "Lámpara LED" })]} />, {
      wrapper: Proveedores,
    });

    expect(screen.getByRole("heading", { level: 2, name: "Nuevos ingresos" })).toBeInTheDocument();
    expect(screen.getByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.getByText("Lámpara LED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver novedades/i })).toHaveAttribute("href", "/coleccion");
  });

  it("riel deslizable en mobile y grilla de 4 columnas en desktop (clases: jsdom no aplica @media)", () => {
    render(<NuevosIngresos productos={[producto()]} />, { wrapper: Proveedores });

    const lista = screen.getByRole("list", { name: "Nuevos ingresos" });
    expect(lista.className).toContain("overflow-x-auto");
    expect(lista.className).toContain("md:grid");
    expect(lista.className).toContain("md:grid-cols-4");
  });

  it("el badge NUEVO lo pone ProductCard con esNuevo del backend", () => {
    render(
      <NuevosIngresos productos={[producto({ esNuevo: true }), producto({ id: 2, nombre: "Viejo", esNuevo: false })]} />,
      { wrapper: Proveedores },
    );

    expect(screen.getAllByText("Nuevo")).toHaveLength(1);
  });
});
