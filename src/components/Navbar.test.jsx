import { act, renderHook } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import Navbar from "./Navbar.jsx";
import useCarrito from "../hooks/useCarrito.js";

function renderNavbar(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Navbar />
    </MemoryRouter>,
  );
}

describe("Navbar - badge de carrito", () => {
  beforeEach(() => {
    // Same reset strategy as useCarrito.test.jsx: real `localStorage` is
    // unreliable in this test environment, so state resets through the
    // hook's own public setter instead of `localStorage.clear()`.
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
  });

  it("no muestra badge cuando el carrito está vacío", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: /ver carrito/i })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("muestra el badge con la cantidad total de ítems del carrito", () => {
    // Mount Navbar first so its own `useCarrito()` instance is a live
    // listener when `agregar` writes — a write happening before Navbar
    // mounts wouldn't be picked up, since Navbar's initial state reads real
    // `localStorage`, which is broken in this test environment (see
    // beforeEach comment).
    renderNavbar();
    const { result } = renderHook(() => useCarrito());

    act(() => {
      result.current.agregar(1, 2);
      result.current.agregar(2, 3);
    });

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("el link de carrito apunta a /carrito", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: /ver carrito/i })).toHaveAttribute("href", "/carrito");
  });

  it("oculta el link de carrito en rutas de admin", () => {
    renderNavbar("/catalogo/admin");

    expect(screen.queryByRole("link", { name: /ver carrito/i })).not.toBeInTheDocument();
  });

  it("oculta también el corazón de favoritos en rutas de admin (sin romper la asimetría existente)", () => {
    renderNavbar("/catalogo/admin");

    expect(screen.queryByRole("link", { name: /ver favoritos/i })).not.toBeInTheDocument();
  });
});

describe("Navbar - logo", () => {
  it("el logo YIMA es un link a la home", () => {
    renderNavbar();

    expect(screen.getByRole("link", { name: "YIMA" })).toHaveAttribute("href", "/");
  });

  it("el logo sigue siendo link en rutas de admin", () => {
    renderNavbar("/catalogo/admin");

    expect(screen.getByRole("link", { name: "YIMA" })).toHaveAttribute("href", "/");
  });
});
