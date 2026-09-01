import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout.jsx";

function PantallaQueRompe() {
  throw new Error("la pantalla del admin explotó");
}

/**
 * Igual que en `LimiteDeError.test.jsx`: React escupe por `console.error`
 * cada error atrapado por un límite. Se silencia solo acá y se restaura
 * después.
 */
let espiaConsola;

beforeEach(() => {
  espiaConsola = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  espiaConsola.mockRestore();
});

function renderAdmin(elementoDeLaPantalla) {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
      <Routes>
        <Route path="/catalogo/admin" element={<AdminLayout />}>
          <Route path="productos" element={elementoDeLaPantalla} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLayout", () => {
  it("renderiza la pantalla del outlet junto con la navegación", () => {
    renderAdmin(<p>listado de productos</p>);

    expect(screen.getByText("listado de productos")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /órdenes/i }).length).toBeGreaterThan(0);
  });

  it("contiene el error de una pantalla sin desmontar la navegación", () => {
    renderAdmin(<PantallaQueRompe />);

    expect(screen.getByRole("alert")).toHaveTextContent(/esta pantalla no se pudo mostrar/i);

    // Lo importante: la sidebar sobrevive, así el admin puede irse a otra
    // sección en vez de quedar frente a una página en blanco.
    expect(screen.getAllByRole("link", { name: /órdenes/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /abrir menú/i })).toBeInTheDocument();
  });

  describe("marca de agua del fondo", () => {
    it("no captura clicks ni aparece en el árbol de accesibilidad", () => {
      const { container } = renderAdmin(<p>listado de productos</p>);
      const marca = container.querySelector(".marca-agua-admin");

      // Es un overlay `fixed` a pantalla completa: sin estas dos cosas
      // tapa cada botón del panel y le hace anunciar la marca a un lector
      // de pantalla en todas las secciones.
      expect(marca).toHaveClass("pointer-events-none");
      expect(marca).toHaveAttribute("aria-hidden", "true");
    });

    it("queda por detrás del contenido", () => {
      const { container } = renderAdmin(<p>listado de productos</p>);

      expect(container.querySelector(".marca-agua-admin")).toHaveClass("z-0");
      // La contraparte: sin apilar el contenido por encima, el orden del DOM
      // pondría la marca adelante. El `relative z-10` vive en el contenedor
      // que envuelve al <header> y al <main> —no en el <main>—, para que los
      // diálogos `fixed z-50` de las pantallas compartan contexto de
      // apilamiento con la barra superior y puedan taparla (ver el test de
      // más abajo).
      const contenedor = container.querySelector(".z-10");
      expect(contenedor).toHaveClass("relative", "z-10");
      expect(contenedor).toContainElement(container.querySelector("header"));
      expect(contenedor).toContainElement(container.querySelector("main"));
      expect(container.querySelector("main")).not.toHaveClass("z-10");
    });

    it("no aporta contenido de texto", () => {
      const { container } = renderAdmin(<p>listado de productos</p>);

      // El logo se pinta con `background-image`, no con una <img>: no debe
      // haber un nodo de imagen que un lector pueda llegar a anunciar.
      expect(container.querySelector(".marca-agua-admin").textContent).toBe("");
      expect(container.querySelector(".marca-agua-admin img")).toBeNull();
    });
  });

  describe("barra superior en flujo (< lg)", () => {
    it("muestra una barra superior con el botón Abrir menú", async () => {
      const user = userEvent.setup();
      renderAdmin(<p>listado de productos</p>);

      const barra = screen.getByRole("banner");
      const boton = within(barra).getByRole("button", { name: /abrir menú/i });
      expect(boton).toHaveAttribute("aria-expanded", "false");

      await user.click(boton);

      expect(boton).toHaveAttribute("aria-expanded", "true");
    });

    it("el main no es un scroll container", () => {
      // `overflow-x-auto` volvía al <main> un scroll container de alto no
      // acotado, y con eso ningún `position: sticky` de las pantallas de
      // adentro podía anclarse a nada. `overflow-x-clip` sigue cortando el
      // desborde horizontal sin ese efecto: con el eje Y en su default
      // `visible`, CSS Overflow 3 solo fuerza `auto` cuando el otro eje NO es
      // `visible` ni `clip`.
      const { container } = renderAdmin(<p>listado de productos</p>);
      const main = container.querySelector("main");

      expect(main).not.toHaveClass("overflow-x-auto");
      expect(main).toHaveClass("overflow-x-clip");
    });

    it("un diálogo de la pantalla comparte contexto de apilamiento con la barra", () => {
      // Los cuatro diálogos del panel (borrado masivo, borrado del editor,
      // confirmación de precios, notificar estado) son `fixed inset-0 z-50` y
      // se renderizan DENTRO del outlet. Si el <main> creara su propio
      // contexto de apilamiento (`relative z-10`), la capa efectiva del
      // diálogo pasaría a ser la del <main> (10) y el <header> `z-30`,
      // hermano de ese contexto, se pintaría encima: con un modal abierto
      // quedaba una banda de 56px arriba, con hamburguesa y toggle de tema
      // tocables. Compartiendo contenedor, dentro de él manda el z-index y
      // 50 > 30. jsdom no compone capas, así que esto es lo más cerca que
      // llega de la garantía; la medición real está en `admin-mobile.spec.js`
      // (`document.elementFromPoint` sobre el botón "Abrir menú").
      const { container } = renderAdmin(
        <div role="dialog" aria-label="Eliminar productos" className="fixed inset-0 z-50">
          ¿Seguro?
        </div>,
      );

      const dialogo = screen.getByRole("dialog", { name: "Eliminar productos" });
      const cabecera = container.querySelector("header");
      const contenedor = container.querySelector(".z-10");

      expect(contenedor).not.toBeNull();
      expect(dialogo.closest(".z-10")).toBe(contenedor);
      expect(cabecera.closest(".z-10")).toBe(contenedor);
    });

    it("cierra el drawer al cambiar de ruta", async () => {
      const user = userEvent.setup();
      const { container } = render(
        <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
          <Routes>
            <Route path="/catalogo/admin" element={<AdminLayout />}>
              <Route
                path="productos"
                element={<Link to="/catalogo/admin/ordenes">ir a órdenes</Link>}
              />
              <Route path="ordenes" element={<p>listado de órdenes</p>} />
            </Route>
          </Routes>
        </MemoryRouter>,
      );

      await user.click(screen.getByRole("button", { name: /abrir menú/i }));
      expect(container.querySelector("aside")).not.toHaveAttribute("inert");

      await user.click(screen.getByRole("link", { name: /ir a órdenes/i }));

      expect(container.querySelector("aside")).toHaveAttribute("inert");
    });
  });
});
