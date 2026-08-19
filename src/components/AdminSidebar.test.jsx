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

    for (const etiqueta of [/productos/i, /órdenes/i, /embudo/i, /métricas/i, /logs/i]) {
      expect(screen.getAllByRole("link", { name: etiqueta })).toHaveLength(2);
    }
  });
});
