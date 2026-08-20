import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Carrito from "./Carrito.jsx";
import useCarrito from "../hooks/useCarrito.js";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

const PRODUCTO_1 = {
  id: 1,
  nombre: "Reloj Clásico",
  precio: "1500.00",
  fotos: [{ url: "https://ejemplo.com/foto1.jpg" }],
};

const PRODUCTO_2 = {
  id: 2,
  nombre: "Anillo Elegance",
  precio: "2300.50",
  fotos: [],
};

// NOTA sobre orden de mount (mismo patrón que BotonAgregarCarrito.test.jsx /
// useCarrito.test.jsx): el localStorage real de este entorno de test es poco
// confiable, así que `useCarrito`'s initial `useState(() => leerCarrito())`
// no puede usarse para "sembrar" estado antes de montar `Carrito` — hay que
// montar PRIMERO (`renderCarrito()` y/o un `renderHook` de control), y recién
// después mutar el carrito con `act()`, para que ambas instancias reciban el
// cambio vía el mecanismo de listeners a nivel de módulo, no vía una lectura
// fresca de localStorage.
function renderCarrito() {
  return render(
    <MemoryRouter>
      <Carrito />
    </MemoryRouter>,
  );
}

describe("Carrito", () => {
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

  it("muestra el estado vacío cuando el carrito no tiene líneas", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1, PRODUCTO_2]);

    renderCarrito();

    expect(await screen.findByText(/tu carrito está vacío/i)).toBeInTheDocument();
  });

  it("renderiza las líneas del carrito reconciliadas contra el fetch en vivo", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1, PRODUCTO_2]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 2);
    });

    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.getByText("$ 1.500,00")).toBeInTheDocument();
    // Subtotal de la línea: 1500.00 * 2 = 3000.00 (coincide con el total
    // porque hay una sola línea, por eso se buscan ambos por separado).
    expect(screen.getAllByText("$ 3.000,00")).toHaveLength(2);
    expect(screen.getByTestId("carrito-total")).toHaveTextContent("$ 3.000,00");
  });

  it("muestra un placeholder cuando el producto no tiene foto", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1, PRODUCTO_2]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(2, 1);
    });

    expect(await screen.findByText("Anillo Elegance")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /anillo elegance/i })).not.toBeInTheDocument();
  });

  it("advierte sobre una línea cuyo producto ya no existe y permite quitarla", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 1);
      carritoHook.current.agregar(99, 1); // 99 no existe en el fetch en vivo
    });

    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.getByText(/ya no está disponible/i)).toBeInTheDocument();

    expect(carritoHook.current.carrito).toEqual([
      { productId: 1, cantidad: 1 },
      { productId: 99, cantidad: 1 },
    ]);
  });

  it("permite quitar una línea con problema de reconciliación mediante el botón de aviso", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 1);
      carritoHook.current.agregar(99, 1);
    });

    await screen.findByText(/ya no está disponible/i);

    await user.click(screen.getByRole("button", { name: /quitar producto no disponible/i }));

    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });

  it("deshabilita el CTA de continuar cuando hay una línea con problema de reconciliación", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 1);
      carritoHook.current.agregar(99, 1);
    });

    await screen.findByText(/ya no está disponible/i);

    // `aria-disabled` sobre un <Link>/<a> no es confiable entre lectores de
    // pantalla, así que el CTA deshabilitado se renderiza como <button
    // disabled> nativo en vez de un link con ARIA — no debe existir ningún
    // link "Confirmar pedido" enfocable/clickeable en este estado.
    expect(screen.queryByRole("link", { name: /confirmar pedido/i })).not.toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /confirmar pedido/i });
    expect(cta).toBeDisabled();
  });

  it("habilita el CTA cuando todas las líneas son válidas", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();

    // Habilitado: debe ser un <Link> real (navegable), no un botón.
    expect(screen.queryByRole("button", { name: /confirmar pedido/i })).not.toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /confirmar pedido/i });
    expect(cta).toHaveAttribute("href", "/checkout");
  });

  it("actualiza la cantidad de una línea vía el selector, y el subtotal reacciona", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByText("Reloj Clásico");

    await user.click(screen.getByRole("button", { name: /aumentar/i }));

    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
    expect(await screen.findByTestId("carrito-total")).toHaveTextContent("$ 3.000,00");
  });

  it("quita una línea válida mediante el botón de eliminar", async () => {
    productsApi.getProducts.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByText("Reloj Clásico");

    await user.click(screen.getByRole("button", { name: /eliminar del carrito/i }));

    expect(carritoHook.current.carrito).toEqual([]);
    expect(await screen.findByText(/tu carrito está vacío/i)).toBeInTheDocument();
  });

  it("calcula el total sumando en centavos para evitar drift de punto flotante", async () => {
    // Caso que SÍ detecta una regresión (a diferencia de 0.10+0.20+0.30, que
    // formatea igual con Intl.NumberFormat sin importar el método de suma —
    // falso guardián). Con tres líneas de $2,675, la suma naive en float
    // da 8.024999999999999 -> formatea a "8,02"; la suma correcta en
    // centavos (redondeando cada línea a centavos antes de sumar) da
    // 8.04 -> formatea a "8,04". Si alguien revierte `precioACentavos` a una
    // suma naive con parseFloat, este test falla.
    const PROD_A = { id: 10, nombre: "A", precio: "2.675", fotos: [] };
    const PROD_B = { id: 11, nombre: "B", precio: "2.675", fotos: [] };
    const PROD_C = { id: 12, nombre: "C", precio: "2.675", fotos: [] };

    productsApi.getProducts.mockResolvedValue([PROD_A, PROD_B, PROD_C]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCarrito();

    act(() => {
      carritoHook.current.agregar(10, 1);
      carritoHook.current.agregar(11, 1);
      carritoHook.current.agregar(12, 1);
    });

    await screen.findByText("A");

    expect(screen.getByTestId("carrito-total")).toHaveTextContent("$ 8,04");
  });

  it("usa BotonVolver para la navegación hacia atrás", async () => {
    productsApi.getProducts.mockResolvedValue([]);

    renderCarrito();

    expect(await screen.findByRole("button", { name: /volver/i })).toBeInTheDocument();
  });
});

describe("Carrito — fallo de red", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
    vi.clearAllMocks();
  });

  it("muestra un error y apaga el spinner si no se pueden cargar los productos", async () => {
    productsApi.getProducts.mockRejectedValue(new Error("network down"));

    renderCarrito();

    expect(
      await screen.findByText(/No pudimos cargar tu carrito/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando carrito…")).not.toBeInTheDocument();
  });
});
