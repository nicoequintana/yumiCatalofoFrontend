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
  stock: 10,
};

const PRODUCTO_AGOTADO = {
  id: 6,
  nombre: "Reloj Agotado",
  stock: 0,
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

  it("limpia el timer de feedback al desmontar (sin timers vivos)", () => {
    vi.useFakeTimers();
    const { unmount } = render(<BotonAgregarCarrito producto={PRODUCTO} />);

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /agregar al carrito/i }));
    });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  describe("tope de cantidad contra el stock disponible", () => {
    it("no deja seleccionar más unidades que el stock", () => {
      render(<BotonAgregarCarrito producto={{ id: 7, nombre: "Poco stock", stock: 2 }} />);

      const aumentar = screen.getByRole("button", { name: /aumentar/i });
      fireEvent.click(aumentar); // 1 -> 2
      fireEvent.click(aumentar); // en el máximo: no-op

      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.queryByText("3")).not.toBeInTheDocument();
      expect(aumentar).toBeDisabled();
    });

    it("descuenta lo que ya está en el carrito del margen disponible", () => {
      // Mount ANTES de mutar (ver la nota del beforeEach: el localStorage
      // real está roto acá, la sincronización llega por los listeners).
      const { result: carritoHook } = renderHook(() => useCarrito());
      render(<BotonAgregarCarrito producto={{ id: 7, nombre: "Poco stock", stock: 2 }} />);

      act(() => {
        carritoHook.current.agregar(7, 1);
      });

      // Stock 2 con 1 ya en el carrito: solo se puede agregar 1 más.
      expect(screen.getByRole("button", { name: /aumentar/i })).toBeDisabled();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("con todo el stock ya en el carrito deshabilita el CTA y lo dice", () => {
      const { result: carritoHook } = renderHook(() => useCarrito());
      render(<BotonAgregarCarrito producto={{ id: 7, nombre: "Poco stock", stock: 2 }} />);

      act(() => {
        carritoHook.current.agregar(7, 2);
      });

      const boton = screen.getByRole("button", { name: /máximo en carrito/i });
      expect(boton).toBeDisabled();
      // El selector no tiene nada que seleccionar en este estado.
      expect(screen.queryByRole("button", { name: /aumentar/i })).toBeNull();

      fireEvent.click(boton);
      expect(carritoHook.current.carrito).toEqual([{ productId: 7, cantidad: 2 }]);
      expect(productsApi.registrarEvento).not.toHaveBeenCalled();
    });

    it("sin stock conocido no inventa un tope", () => {
      // Un producto sin el campo `stock` (payload viejo o parcial): el clamp
      // solo aplica cuando el stock vivo se conoce.
      render(<BotonAgregarCarrito producto={{ id: 8, nombre: "Sin dato" }} />);

      const aumentar = screen.getByRole("button", { name: /aumentar/i });
      fireEvent.click(aumentar);
      fireEvent.click(aumentar);
      fireEvent.click(aumentar);

      expect(screen.getByText("4")).toBeInTheDocument();
      expect(aumentar).not.toBeDisabled();
    });
  });

  describe("producto agotado (stock 0)", () => {
    it("deshabilita el CTA y lo etiqueta 'Sin stock'", () => {
      render(<BotonAgregarCarrito producto={PRODUCTO_AGOTADO} />);

      const boton = screen.getByRole("button", { name: /sin stock/i });
      expect(boton).toBeDisabled();
      expect(screen.queryByRole("button", { name: /agregar al carrito/i })).toBeNull();
    });

    it("oculta el selector de cantidad", () => {
      render(<BotonAgregarCarrito producto={PRODUCTO_AGOTADO} />);

      expect(screen.queryByRole("button", { name: /aumentar/i })).toBeNull();
    });

    it("no agrega nada al carrito aunque se dispare el click", () => {
      const { result: carritoHook } = renderHook(() => useCarrito());

      render(<BotonAgregarCarrito producto={PRODUCTO_AGOTADO} />);
      fireEvent.click(screen.getByRole("button", { name: /sin stock/i }));

      expect(carritoHook.current.carrito).toEqual([]);
      expect(productsApi.registrarEvento).not.toHaveBeenCalled();
    });
  });
});
