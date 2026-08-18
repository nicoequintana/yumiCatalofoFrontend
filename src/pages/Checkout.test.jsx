import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout.jsx";
import useCarrito from "../hooks/useCarrito.js";
import * as productsApi from "../api/products.js";
import * as ordenesApi from "../api/ordenes.js";

vi.mock("../api/products.js");
vi.mock("../api/ordenes.js");

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const PRODUCTO_1 = {
  id: 1,
  nombre: "Reloj Clásico",
  precio: "1500.00",
  disponibilidad: "DISPONIBLE",
  fotos: [],
};

function renderCheckout() {
  return render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>,
  );
}

describe("Checkout", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirige a /carrito cuando el carrito está vacío", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    renderCheckout();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/carrito", { replace: true });
    });
  });

  it("redirige a /carrito cuando todas las líneas quedaron no disponibles", async () => {
    productsApi.getProducts.mockResolvedValue([]); // producto 1 ya no existe

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/carrito", { replace: true });
    });
  });

  it("muestra el formulario cuando hay al menos una línea válida", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 2);
    });

    expect(await screen.findByLabelText(/dni/i)).toBeInTheDocument();
    expect(screen.getByText(/2 × Reloj Clásico/)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("valida que dni, nombre y teléfono sean obligatorios antes de enviar", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("El DNI es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El teléfono es obligatorio.")).toBeInTheDocument();
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();
  });

  it("envía la orden con las líneas válidas y navega a la confirmación con el state", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);
    const ordenCreada = { id: 42, items: [{ productId: 1, nombreProducto: "Reloj Clásico" }] };
    ordenesApi.crearOrden.mockResolvedValue(ordenCreada);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 2);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    await waitFor(() => {
      expect(ordenesApi.crearOrden).toHaveBeenCalledWith({
        dni: "12345678",
        nombre: "Juana Pérez",
        telefono: "1122334455",
        email: undefined,
        notas: undefined,
        items: [{ productId: 1, cantidad: 2 }],
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/checkout/confirmacion", {
        state: { orden: ordenCreada },
      });
    });

    // El carrito NO se vacía en Checkout — eso pasa recién en OrdenConfirmada.
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
  });

  it("deshabilita el botón de submit mientras la request está en curso", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);
    let resolverCrear;
    ordenesApi.crearOrden.mockReturnValue(
      new Promise((resolve) => {
        resolverCrear = resolve;
      }),
    );

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");

    const boton = screen.getByRole("button", { name: /confirmar pedido/i });
    await user.click(boton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
    });

    resolverCrear({ id: 1, items: [] });
  });

  it("muestra el error del backend y no navega ni limpia el formulario si la request falla", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);
    ordenesApi.crearOrden.mockRejectedValue(new Error("El producto Reloj Clásico está agotado."));

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("El producto Reloj Clásico está agotado.")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();

    const boton = screen.getByRole("button", { name: /confirmar pedido/i });
    expect(boton).not.toBeDisabled();

    // El carrito sigue intacto.
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });
});
