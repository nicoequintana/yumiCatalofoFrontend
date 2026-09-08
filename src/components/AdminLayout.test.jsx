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

  /**
   * La navegación va PRIMERA en el DOM (tiene que quedar fuera del contenedor
   * `relative z-10` para que sus tres capas `fixed` se comparen contra el
   * contexto raíz), así que quien navega por teclado pagaba trece tabulaciones
   * —los diez ítems de la bottom nav más Configuración, tema y logout— antes
   * de tocar el contenido. En cada pantalla y en cada recarga.
   *
   * Se resuelve con un enlace de salto y NO moviendo la nav después del
   * `<main>`: ese orden del DOM es justamente lo que sostiene el contrato de
   * apilamiento documentado acá abajo (diálogos `z-50` contra barra `z-30` y
   * bottom nav `z-40`), y reordenarlo por CSS reabriría el bug de la banda de
   * 56px tocable sobre un modal abierto. El enlace es además el mecanismo que
   * WCAG nombra para esto (SC 2.4.1, Bypass Blocks).
   */
  describe("enlace de salto al contenido", () => {
    it("es la primera parada de teclado y apunta al main", async () => {
      const user = userEvent.setup();
      const { container } = renderAdmin(<p>listado de productos</p>);

      await user.tab();

      const salto = screen.getByRole("link", { name: /saltar al contenido/i });
      expect(document.activeElement).toBe(salto);
      expect(salto).toHaveAttribute("href", "#contenido-admin");

      const main = container.querySelector("main");
      expect(main).toHaveAttribute("id", "contenido-admin");
      // Sin `tabIndex="-1"` el `<main>` no es un destino de foco válido:
      // el hash movería el scroll pero el foco del teclado se quedaría donde
      // estaba y la siguiente tabulación volvería a la nav.
      expect(main).toHaveAttribute("tabindex", "-1");
    });

    it("está oculto hasta que se lo enfoca", () => {
      renderAdmin(<p>listado de productos</p>);

      const salto = screen.getByRole("link", { name: /saltar al contenido/i });

      // `sr-only` lo saca de la vista sin sacarlo del orden de tabulado
      // (`display: none` lo volvería inalcanzable, que es lo contrario de lo
      // que este enlace existe para lograr); `focus:not-sr-only` lo devuelve.
      expect(salto).toHaveClass("sr-only", "focus:not-sr-only");
    });
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

    it("ancla su top a la variable de la cinta de ambiente, no a top-0", () => {
      // `top-0` clavaba la barra debajo de la cinta de dev (`CintaAmbiente.jsx`)
      // solo mientras esta valía `0px`. `--alto-cinta-ambiente` es la misma
      // variable que la cinta declara: en dev vale su alto real y la barra se
      // corre debajo; en producción, donde la cinta no existe, vuelve a `0px` y
      // el resultado es idéntico al `top-0` de antes.
      const { container } = renderAdmin(<p>listado de productos</p>);
      const barra = container.querySelector("header");

      expect(barra).toHaveClass("top-[var(--alto-cinta-ambiente)]");
      expect(barra).not.toHaveClass("top-0");
    });

    it("el <main> reserva el alto de la cinta que la barra sticky se corrió", () => {
      // Contracara del `top` de arriba, y la causa real de un área táctil
      // recortada: `sticky top-[var(--alto-cinta-ambiente)]` se activa YA en
      // scroll 0 —la posición natural de la barra (y = 0) está por encima del
      // umbral—, así que la barra se pinta 24px más abajo que su lugar en el
      // flujo y se monta sobre los primeros 24px del `<main>`. La barra NO es
      // `pointer-events-none`: esos 24px se comen los clicks de lo que haya
      // debajo. Medido en navegador el 07/09/2026 sobre
      // `/catalogo/admin/productos/nuevo`, con `elementFromPoint`: el botón
      // "Volver" del editor —que arranca a 16px del tope del `<main>` por el
      // `py-4` de `EditorHeader`— declara `min-h-11` y mide 89x44 de caja,
      // pero su área efectiva daba 89x36, o sea los 8px que le quedaban
      // debajo de la cinta (24 - 16 = 8). Pasaba en 390 y en 1280, los dos
      // anchos donde esta barra existe (se esconde recién en 1360).
      //
      // En producción la cinta no está en el DOM y la variable vale `0px`:
      // este padding es exactamente cero y no cambia nada de lo publicado.
      const { container } = renderAdmin(<p>listado de productos</p>);

      expect(container.querySelector("main")).toHaveClass("pt-[var(--alto-cinta-ambiente)]");
    });

    it("acompaña el corte de lg de la bottom nav", () => {
      // La barra superior y el hueco del `<main>` son la contraparte exacta
      // de la bottom nav: si la nav aparece en `lg` y la barra se escondiera
      // en otro ancho, en el medio no habría NADA que abra el drawer, o la
      // bottom nav taparía el final del contenido. Los tres valores tienen
      // que moverse juntos. El corte vivió en `min-[1360px]` entre el
      // 07/09/2026 y el 08/09/2026 (diez ítems en la nav); la reorganización
      // en cinco ítems más dos acordeones lo devolvió a `lg`, medido en
      // `AdminSidebar.jsx` / `e2e/admin-desktop-layout.spec.js`.
      const { container } = renderAdmin(<p>listado de productos</p>);

      expect(container.querySelector("header")).toHaveClass("lg:hidden");
      expect(container.querySelector("header")).not.toHaveClass("min-[1360px]:hidden");
      expect(container.querySelector("main")).toHaveClass("lg:pb-20");
      expect(container.querySelector("main")).not.toHaveClass("min-[1360px]:pb-20");
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
