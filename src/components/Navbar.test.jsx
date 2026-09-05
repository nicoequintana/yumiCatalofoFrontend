import { act, renderHook } from "@testing-library/react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Navbar from "./Navbar.jsx";
import useCarrito from "../hooks/useCarrito.js";

const categoriasNavbarMock = vi.fn(() => ({
  categorias: [{ id: 1002, nombre: "Cocina", cantidadPublicados: 27 }],
  resuelto: true,
}));
vi.mock("../hooks/useCategoriasNavbar.js", () => ({
  default: (...args) => categoriasNavbarMock(...args),
}));

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

// Esta barra llegó a esconderse en la ficha por debajo de `md`, y fue un error
// que duró unas horas: al mover lupa, favoritos y carrito de vuelta acá, la
// ficha se quedó SIN carrito, y la isla —que sí seguía ahí— le tapaba el botón
// "Agregar" de la barra de compra. La salida correcta fue la inversa: la barra
// se ve en todas las rutas públicas, y la que no se monta en la ficha es la
// isla (ver `NavFlotante.jsx`).
describe("Navbar - se ve en TODAS las rutas públicas, la ficha incluida", () => {
  it("en la ficha la barra está, sin clase que la esconda", () => {
    const { container } = renderNavbar("/producto/123-lampara-de-sal");
    const header = container.querySelector("header");

    expect(header).toBeInTheDocument();
    expect(header).not.toHaveClass("hidden");
  });

  it("en la ficha se puede llegar al carrito y a favoritos", () => {
    // Es el punto: en esa pantalla esta barra es el ÚNICO camino a las dos,
    // porque la isla no se monta ahí.
    renderNavbar("/producto/123-lampara-de-sal");

    expect(screen.getByRole("link", { name: "Ver carrito" })).toHaveAttribute("href", "/carrito");
    expect(screen.getByRole("link", { name: "Ver favoritos" })).toHaveAttribute(
      "href",
      "/favoritos",
    );
  });

  it("en el resto del catálogo la barra se ve igual", () => {
    for (const ruta of ["/", "/coleccion", "/favoritos", "/carrito"]) {
      const { container, unmount } = renderNavbar(ruta);
      expect(container.querySelector("header")).not.toHaveClass("hidden");
      unmount();
    }
  });
});

// El reparto del 05/09/2026 devolvió lupa, favoritos y carrito a la barra
// también por debajo de `md`: la isla (`NavFlotante`) se queda con un solo
// control (la hamburguesa) y estas tres acciones necesitan un camino que no
// dependa de abrir la hoja. El contenedor pasó de `hidden md:flex` a `flex`.
describe("Navbar - acciones también en móvil", () => {
  it("el contenedor de acciones no lleva `hidden`: se ve por debajo de md", () => {
    renderNavbar();

    const lupa = screen.getByRole("link", { name: "Buscar productos" });
    expect(lupa.parentElement).not.toHaveClass("hidden");
  });

  it("lupa, favoritos y carrito están las tres en el DOM sin ancestro oculto", () => {
    renderNavbar();

    for (const nombre of ["Buscar productos", "Ver favoritos", "Ver carrito"]) {
      const accion = screen.getByRole("link", { name: nombre });
      expect(accion.parentElement).not.toHaveClass("hidden");
    }
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
  it("muestra Inicio como link y Productos como disparador del panel", () => {
    renderNavbar();

    expect(navPrincipal().getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(navPrincipal().getByRole("button", { name: "Productos" })).toBeInTheDocument();
  });

  it("marca Productos activo (por estilo) cuando la ruta es de catálogo", () => {
    renderNavbar("/coleccion");

    // Ya no es un link con aria-current: el estado activo del disparador es
    // visual (clase), no semántico — sigue siendo un botón que abre un panel,
    // no una página distinta.
    expect(navPrincipal().getByRole("button", { name: "Productos" })).toBeInTheDocument();
    expect(navPrincipal().getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  // El detalle de un producto no es "Productos": marcar ese item ahí haría que
  // el subrayado dijera algo que la URL no dice.
  it("no marca Inicio como activo fuera de su ruta", () => {
    renderNavbar("/carrito");

    expect(navPrincipal().getByRole("link", { name: "Inicio" })).not.toHaveAttribute(
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

  it("oculta la navegación en rutas de admin", () => {
    renderNavbar("/catalogo/admin");

    expect(screen.queryByRole("navigation", { name: "Navegación principal" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Buscar productos" })).not.toBeInTheDocument();
  });
});

// El menú móvil (panel, botón de hamburguesa, velo) ya no vive en `Navbar`:
// se mudó a `NavFlotante` (el botón que lo abre) y `HojaMenu` (el panel en
// sí), ambos montados desde `Layout.jsx`. La cobertura que tenía este
// `describe` se movió a `NavFlotante.test.jsx` (el botón y su estado
// `aria-expanded`) y a `HojaMenu.test.jsx` (el contenido del panel, Escape,
// y el bloqueo de scroll).

describe("Navbar - dropdown de categorías", () => {
  it("Productos es un botón que abre el panel, no un link", async () => {
    const usuario = userEvent.setup();
    renderNavbar();

    const disparador = screen.getByRole("button", { name: "Productos" });
    expect(disparador).toHaveAttribute("aria-expanded", "false");

    await usuario.click(disparador);

    expect(disparador).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /todos/i })).toBeInTheDocument();
  });

  it("Escape cierra el panel y devuelve el foco al disparador", async () => {
    const usuario = userEvent.setup();
    renderNavbar();

    const disparador = screen.getByRole("button", { name: "Productos" });
    await usuario.click(disparador);
    await usuario.keyboard("{Escape}");

    expect(disparador).toHaveAttribute("aria-expanded", "false");
    expect(disparador).toHaveFocus();
  });

  it("navegar a otra ruta cierra el panel", async () => {
    const usuario = userEvent.setup();
    renderNavbar();

    await usuario.click(screen.getByRole("button", { name: "Productos" }));
    await usuario.click(screen.getByRole("link", { name: /todos/i }));

    expect(screen.getByRole("button", { name: "Productos" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("Navbar - carga de categorías", () => {
  beforeEach(() => {
    categoriasNavbarMock.mockClear();
  });

  it("pide categorías en una ruta pública", () => {
    renderNavbar("/");

    expect(categoriasNavbarMock).toHaveBeenCalledWith({ activo: true });
  });

  // I3: en `/catalogo/admin/login` el dropdown no existe (`esAdmin` esconde
  // toda la navegación), así que la request no hace falta — antes salía
  // igual porque el hook se invocaba antes del guard.
  it("no pide categorías en /catalogo/admin/login", () => {
    renderNavbar("/catalogo/admin/login");

    expect(categoriasNavbarMock).toHaveBeenCalledWith({ activo: false });
  });
});
