import { act, render, renderHook, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import OrdenConfirmada from "./OrdenConfirmada.jsx";
import useCarrito from "../hooks/useCarrito.js";

const ORDEN = {
  id: 42,
  items: [
    { id: 1, productId: 1, nombreProducto: "Reloj Clásico", precioUnitario: "1500.00", cantidad: 2 },
    { id: 2, productId: 2, nombreProducto: "Anillo Elegance", precioUnitario: "2300.50", cantidad: 1 },
  ],
};

function renderConState(state) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/checkout/confirmacion", state }]}>
      <Routes>
        <Route path="/checkout/confirmacion" element={<OrdenConfirmada />} />
        <Route path="/" element={<div>Home</div>} />
        <Route path="/carrito" element={<div>Carrito</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("OrdenConfirmada", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
  });

  afterEach(() => {
    // no-op, cleanup global via afterEach(cleanup) ya configurado
  });

  it("redirige a / cuando no hay state (navegación directa/refresh)", async () => {
    renderConState(undefined);

    expect(await screen.findByText("Home")).toBeInTheDocument();
  });

  it("renderiza el resumen de la orden a partir del state recibido", async () => {
    renderConState({ orden: ORDEN });

    expect(await screen.findByText(/pedido confirmado/i)).toBeInTheDocument();
    expect(screen.getByText(/orden #42/i)).toBeInTheDocument();
    expect(screen.getByText(/2 × Reloj Clásico/)).toBeInTheDocument();
    expect(screen.getByText(/1 × Anillo Elegance/)).toBeInTheDocument();
    // Total: 1500.00*2 + 2300.50*1 = 5300.50
    expect(screen.getByText("$ 5.300,50")).toBeInTheDocument();
  });

  it("vacía el carrito al montar", async () => {
    const { result: carritoHook } = renderHook(() => useCarrito());
    act(() => {
      carritoHook.current.agregar(1, 2);
    });
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);

    renderConState({ orden: ORDEN });

    await screen.findByText(/pedido confirmado/i);

    expect(carritoHook.current.carrito).toEqual([]);
  });

  it("incluye un link para volver al catálogo", async () => {
    renderConState({ orden: ORDEN });

    const link = await screen.findByRole("link", { name: /volver al catálogo/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
