import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSidebar from "./AdminSidebar.jsx";

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
      <AdminSidebar colapsada={false} onCerrar={() => {}} />
    </MemoryRouter>,
  );
}

describe("AdminSidebar", () => {
  /**
   * `ITEMS_NAV` se mapea dos veces (sidebar mobile + bottom nav desktop), así
   * que cada entrada debe aparecer exactamente dos veces en el DOM. Las dos
   * presentaciones se muestran/ocultan por CSS (`md:hidden` / `hidden md:flex`),
   * no por render condicional, por eso ambas están presentes en el árbol.
   */
  it("renderiza Ventas en la nav mobile y en la de escritorio", () => {
    renderSidebar();

    const enlaces = screen.getAllByRole("link", { name: /ventas/i });

    expect(enlaces).toHaveLength(2);
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute("href", "/catalogo/admin/ventas");
    }
  });

  it("mantiene el resto de las entradas de navegación", () => {
    renderSidebar();

    for (const etiqueta of [
      /productos/i,
      /órdenes/i,
      /embudo/i,
      /clientes/i,
      /operación/i,
      /métricas/i,
      /logs/i,
    ]) {
      expect(screen.getAllByRole("link", { name: etiqueta })).toHaveLength(2);
    }
  });
});

/**
 * El agujero que cerró el corte en 1360px: la bottom nav mide 1326px de ancho
 * INTRÍNSECO y no tiene `flex-wrap` ni scroll, así que entre 1024 (donde
 * `lg:flex` la encendía) y 1325 lo que sobraba se pintaba fuera del viewport
 * SIN generar scroll de documento — "Cerrar sesión" era inalcanzable con el
 * mouse por debajo de 1134px, y a 1024 ni el toggle de tema ni el logout los
 * devolvía `elementFromPoint`.
 *
 * jsdom no aplica `@media`, así que acá se fija el CONTRATO DE CLASES; la
 * medición real (visible + clickeable a 1024, 1280 y 1359) vive en
 * `e2e/admin-desktop-layout.spec.js`.
 */
describe("AdminSidebar — el corte entre drawer y bottom nav", () => {
  it("la bottom nav recién aparece en 1360px, no en lg", () => {
    const { container } = renderSidebar();
    const bottomNav = container.querySelector("nav.fixed.inset-x-0.bottom-0");

    expect(bottomNav).not.toBeNull();
    expect(bottomNav).toHaveClass("min-[1360px]:flex");
    expect(bottomNav).not.toHaveClass("lg:flex");
  });

  it("el drawer sigue disponible por debajo de 1360px", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");

    expect(aside).toHaveClass("min-[1360px]:hidden");
    expect(aside).not.toHaveClass("lg:hidden");
  });

  it("el overlay del drawer acompaña el mismo corte", () => {
    const { container } = renderSidebar();
    const overlay = container.querySelector("div.fixed.inset-0.z-40");

    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("min-[1360px]:hidden");
    expect(overlay).not.toHaveClass("lg:hidden");
  });

  /**
   * Campañas y Promociones estaban filtradas del drawer porque su pantalla no
   * entra en un teléfono. Con el drawer siendo ahora la navegación hasta
   * 1359px, filtrarlas las dejaba inalcanzables en iPad apaisado y en un
   * portátil de 1280 — justo los anchos donde SÍ funcionan. Vuelven al drawer
   * con el mismo mecanismo de siempre (flag en el dato + CSS, nunca
   * `matchMedia`): `hidden lg:flex` las muestra desde 1024, que es el mismo
   * umbral que usa `SoloEscritorio` para dejar entrar a la pantalla.
   */
  it("los módulos solo-escritorio están en el drawer, ocultos por debajo de lg", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");

    for (const etiqueta of [/campañas/i, /promociones/i]) {
      const enElDrawer = screen
        .getAllByRole("link", { name: etiqueta })
        .find((enlace) => aside.contains(enlace));

      expect(enElDrawer, `${etiqueta} en el drawer`).toBeDefined();
      expect(enElDrawer).toHaveClass("hidden", "lg:flex");
    }
  });
});

/**
 * WCAG 2.2 SC 2.5.8 (Target Size, Minimum) pide 24px, pero el criterio del
 * proyecto —y el que mide `admin-mobile.spec.js`— es el de 44px de Apple/MDN.
 * Los controles del shell medían 42px de alto: dos píxeles de menos en TODAS
 * las pantallas del panel. `min-h-11` (44px) es el piso; el padding sigue
 * mandando cuando el contenido crece.
 */
describe("AdminSidebar — áreas táctiles del shell", () => {
  it("los enlaces, el acordeón y el logout del drawer declaran 44px de piso", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");

    const controles = [
      ...aside.querySelectorAll("a"),
      ...aside.querySelectorAll("button"),
    ];

    expect(controles.length).toBeGreaterThan(0);
    for (const control of controles) {
      expect(control, control.textContent).toHaveClass("min-h-11");
    }
  });
});

describe("AdminSidebar — la sidebar mobile colapsada", () => {
  function renderConColapsada(colapsada) {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={colapsada} onCerrar={() => {}} />
      </MemoryRouter>,
    );
  }

  /**
   * jsdom no implementa `inert` (mismo gotcha que los CTA de la vista previa en
   * `FichaProducto`): `getByRole` sigue encontrando los enlaces de un subárbol
   * inerte. Por eso se verifica que el atributo esté aplicado; que además no sea
   * clickeable ni enfocable se verifica en navegador.
   */
  it("marca la sidebar como inerte mientras está cerrada", () => {
    const { container } = renderConColapsada(true);

    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside).toHaveAttribute("inert");

    // Los enlaces del menú viven adentro del subárbol inerte, no sueltos.
    const enlaceMobile = screen
      .getAllByRole("link", { name: /ventas/i })
      .find((enlace) => aside.contains(enlace));
    expect(enlaceMobile).toBeDefined();
  });

  it("saca el inerte cuando la sidebar se abre", () => {
    const { container } = renderConColapsada(false);

    expect(container.querySelector("aside")).not.toHaveAttribute("inert");
  });
});

describe("AdminSidebar — drawer accesible (useDialogo + useBloquearScroll)", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  function renderDrawer(colapsada, onCerrar = () => {}) {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={colapsada} onCerrar={onCerrar} />
      </MemoryRouter>,
    );
  }

  it("Escape cierra el drawer abierto", () => {
    const onCerrar = vi.fn();
    renderDrawer(false, onCerrar);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("Escape no hace nada con el drawer cerrado", () => {
    const onCerrar = vi.fn();
    renderDrawer(true, onCerrar);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("el drawer es un diálogo modal con nombre", () => {
    const { container } = renderDrawer(false);

    expect(screen.getByRole("dialog", { name: "Menú" })).toBe(container.querySelector("aside"));
  });

  it("bloquea el scroll del body abierto y lo libera cerrado", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={false} onCerrar={() => {}} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={true} onCerrar={() => {}} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).not.toBe("hidden");
  });

  /**
   * Mitigación del drawer fantasma: abrir el drawer entre 768 y 1023px y
   * rotar a `lg` esconde el `<aside>` (`lg:hidden`) sin que nada avise al
   * estado de React, así que `useBloquearScroll` deja el body bloqueado y
   * `useDialogo` sigue atrapando el foco en enlaces invisibles. Sin
   * `matchMedia` (el plan prohíbe breakpoints en JS) no hay forma de
   * detectar el cruce; lo que sí se puede es dejar una salida visible: la
   * bottom nav de escritorio ya está en pantalla, y con `onCerrar` en sus
   * ítems cualquier toque —incluida la pestaña ACTUAL, que no navega y por
   * eso no dispara el cierre por cambio de ruta— libera el drawer.
   */
  it("un ítem de la bottom nav de escritorio cierra el drawer abierto", () => {
    const onCerrar = vi.fn();
    renderDrawer(false, onCerrar);

    // El segundo "Ventas" es el de la bottom nav: `ITEMS_NAV` se mapea
    // primero en el drawer y después en la nav de escritorio.
    const [, ventasEscritorio] = screen.getAllByRole("link", { name: /ventas/i });
    fireEvent.click(ventasEscritorio);

    expect(onCerrar).toHaveBeenCalled();
  });

  it("el botón Configuración de escritorio también cierra el drawer", () => {
    const onCerrar = vi.fn();
    renderDrawer(false, onCerrar);

    // El primer "Configuración" es el acordeón del drawer (que no debe
    // cerrarlo: despliega su propio submenú); el segundo es el de la bottom
    // nav de escritorio.
    const [, configuracionEscritorio] = screen.getAllByRole("button", { name: /configuración/i });
    fireEvent.click(configuracionEscritorio);

    expect(onCerrar).toHaveBeenCalled();
  });

  it("enfoca el primer enlace al abrir", () => {
    const { container } = renderDrawer(false);
    const aside = container.querySelector("aside");

    expect(document.activeElement).toBe(within(aside).getByRole("link", { name: /productos/i }));
  });
});
