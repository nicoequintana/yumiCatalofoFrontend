import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BotonAgregarCarrito from "./BotonAgregarCarrito.jsx";
import useCarrito from "../hooks/useCarrito.js";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

const PRODUCTO = {
  id: 5,
  nombre: "Reloj Clásico",
};

describe("BotonAgregarCarrito", () => {
  beforeEach(() => {
    // Same reset strategy as useCarrito.test.jsx/useFavoritos.test.jsx: this
    // environment's real `localStorage` is unreliable (Node's
    // `--localstorage-file` flag shadows jsdom's implementation without a
    // configured path), so state is reset through the hook's own public
    // setter instead of `localStorage.clear()`.
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });

    vi.clearAllMocks();
    productsApi.registrarEvento.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("agrega el producto al carrito con la cantidad seleccionada", async () => {
    // Hook instance mounted BEFORE the click so it's a live listener —
    // `escribirCarrito` only notifies currently-mounted instances, and a
    // fresh `renderHook` afterwards would re-read real `localStorage`,
    // which is broken in this test environment (see beforeEach comment).
    const { result: carritoHook } = renderHook(() => useCarrito());

    const user = userEvent.setup();
    render(<BotonAgregarCarrito producto={PRODUCTO} />);

    await user.click(screen.getByRole("button", { name: /aumentar/i }));
    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));

    expect(carritoHook.current.carrito).toEqual([{ productId: 5, cantidad: 2 }]);
  });

  it("dispara el evento AGREGADO_CARRITO sin bloquear el feedback del botón", async () => {
    const user = userEvent.setup();
    render(<BotonAgregarCarrito producto={PRODUCTO} />);

    await user.click(screen.getByRole("button", { name: /agregar al carrito/i }));

    expect(productsApi.registrarEvento).toHaveBeenCalledWith("AGREGADO_CARRITO", 5);
    expect(await screen.findByText(/agregado/i)).toBeInTheDocument();
  });

  it("muestra feedback temporal después de agregar, que luego revierte", () => {
    vi.useFakeTimers();
    render(<BotonAgregarCarrito producto={PRODUCTO} />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /agregar al carrito/i }));
    });

    expect(screen.getByText(/agregado/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByRole("button", { name: /agregar al carrito/i })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("un doble-click rápido no duplica el agregado (guard de re-entrada durante la ventana de feedback)", () => {
    // Hook instance mounted BEFORE the clicks so it's a live listener (see
    // comment on the first test above re: broken real localStorage).
    const { result: carritoHook } = renderHook(() => useCarrito());

    render(<BotonAgregarCarrito producto={PRODUCTO} />);

    const boton = screen.getByRole("button", { name: /agregar al carrito/i });
    fireEvent.click(boton);
    fireEvent.click(boton); // fires while `agregado` is still true — must be a no-op

    expect(carritoHook.current.carrito).toEqual([{ productId: 5, cantidad: 1 }]);
    expect(productsApi.registrarEvento).toHaveBeenCalledTimes(1);
  });

  it("el botón queda deshabilitado durante la ventana de feedback, evitando un segundo click", () => {
    render(<BotonAgregarCarrito producto={PRODUCTO} />);

    const boton = screen.getByRole("button", { name: /agregar al carrito/i });
    fireEvent.click(boton);

    expect(screen.getByRole("button", { name: /agregado/i })).toBeDisabled();
  });

  it("resetea la cantidad del selector a 1 después de agregar", () => {
    render(<BotonAgregarCarrito producto={PRODUCTO} />);

    fireEvent.click(screen.getByRole("button", { name: /aumentar/i }));
    fireEvent.click(screen.getByRole("button", { name: /aumentar/i }));
    expect(screen.getByText("3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /agregar al carrito/i }));

    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
