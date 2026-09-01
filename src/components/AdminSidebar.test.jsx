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
