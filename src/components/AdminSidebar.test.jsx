import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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
