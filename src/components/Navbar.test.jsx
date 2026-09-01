import { act, renderHook } from "@testing-library/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("Navbar - barra sticky", () => {
  it("ancla su top a la variable de la cinta de ambiente, no a top-0", () => {
    // Mismo contrato que AdminLayout: `--alto-cinta-ambiente` vale el alto
    // real de la cinta de dev mientras esta existe en el DOM y `0px` en
    // producción — así el navbar no queda tapado por la cinta sin cambiar
    // nada del resultado final en el sitio publicado.
    const { container } = renderNavbar();
    const header = container.querySelector("header");

    expect(header).toHaveClass("top-[var(--alto-cinta-ambiente)]");
    expect(header).not.toHaveClass("top-0");
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

/** La barra de escritorio, para no confundirla con las copias del panel móvil. */
function navPrincipal() {
  return within(screen.getByRole("navigation", { name: "Navegación principal" }));
}

describe("Navbar - navegación", () => {
  it("muestra Inicio y Productos con sus destinos", () => {
    renderNavbar();

    expect(navPrincipal().getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(navPrincipal().getByRole("link", { name: "Productos" })).toHaveAttribute(
      "href",
      "/coleccion",
    );
  });

  it("marca el destino activo con aria-current", () => {
    renderNavbar("/coleccion");

    expect(navPrincipal().getByRole("link", { name: "Productos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(navPrincipal().getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  // El detalle de un producto no es "Productos": marcar ese item ahí haría que
  // el subrayado dijera algo que la URL no dice.
  it("no marca ningún destino como activo fuera de sus rutas", () => {
    renderNavbar("/carrito");

    expect(navPrincipal().getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(navPrincipal().getByRole("link", { name: "Productos" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("la lupa lleva a /coleccion, donde vive el buscador real", () => {
    renderNavbar();

    const lupa = screen.getByRole("link", { name: "Buscar productos" });
    expect(lupa).toHaveAttribute("href", "/coleccion");

    // El nombre accesible NO puede ser "Buscar": ese es el del input real de
    // `/coleccion`, y compartirlo volvería ambiguas las consultas de esa pantalla.
    expect(screen.queryByRole("link", { name: "Buscar" })).not.toBeInTheDocument();
  });

  it("oculta la navegación y el botón de menú en rutas de admin", () => {
    renderNavbar("/catalogo/admin");

    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /abrir menú/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buscar productos" })).not.toBeInTheDocument();
  });
});

describe("Navbar - menú móvil", () => {
  it("el panel no está en el DOM hasta que se abre", () => {
    renderNavbar();

    expect(screen.queryByRole("dialog", { name: "Menú" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menú" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("el botón abre el panel y cambia su estado anunciado", async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    const panel = screen.getByRole("dialog", { name: "Menú" });
    expect(within(panel).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(panel).getByRole("link", { name: "Productos" })).toHaveAttribute(
      "href",
      "/coleccion",
    );
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  // El corazón del header se rotula "Ver favoritos" y el del panel "Favoritos":
  // aunque los dos estén montados (en jsdom no hay CSS que oculte ninguno),
  // nunca comparten nombre accesible, así que `getByRole` sigue devolviendo uno
  // solo y los tests del contrato de favoritos no se vuelven ambiguos.
  it("el link de favoritos del panel no colisiona con el del header", async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("link", { name: /ver favoritos/i })).toHaveAttribute(
      "href",
      "/favoritos",
    );
    const panel = screen.getByRole("dialog", { name: "Menú" });
    expect(within(panel).getByRole("link", { name: "Favoritos" })).toHaveAttribute(
      "href",
      "/favoritos",
    );
  });

  it("Escape cierra el panel", async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Menú" })).not.toBeInTheDocument();
  });

  it("cerrar el panel devuelve el scroll del documento", async () => {
    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
