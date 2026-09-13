import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// `Layout` monta el shell público entero (BarraAnuncios, Navbar, Footer,
// NavFlotante, HojaMenu, BotonWhatsappFlotante, CampaniaModalMontado), cada
// uno con sus propios hooks de datos (contexto comercial, categorías,
// contacto, campañas...). Esta suite prueba SOLO la clase `.tema-publico`
// del wrapper raíz, así que los hijos se reemplazan por stubs — traerlos
// reales exigiría mockear media docena de hooks ajenos a lo que se afirma acá.
vi.mock("./BarraAnuncios.jsx", () => ({ default: () => null }));
vi.mock("./BotonWhatsappFlotante.jsx", () => ({ default: () => null }));
vi.mock("./CampaniaModalMontado.jsx", () => ({ default: () => null }));
vi.mock("./HojaMenu.jsx", () => ({ default: () => null }));
vi.mock("./Navbar.jsx", () => ({ default: () => null }));
vi.mock("./NavFlotante.jsx", () => ({ default: () => null }));
vi.mock("./Footer.jsx", () => ({ default: () => null }));

const { default: Layout } = await import("./Layout.jsx");

function renderLayoutEn(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path={ruta} element={<div>contenido</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout — scope .tema-publico", () => {
  it("aplica tema-publico en rutas públicas", () => {
    const { container } = renderLayoutEn("/");
    expect(container.querySelector(".tema-publico")).not.toBeNull();
  });

  it("NO aplica tema-publico en /catalogo/admin/login: cuelga del mismo Layout que el público", () => {
    const { container } = renderLayoutEn("/catalogo/admin/login");
    expect(container.querySelector(".tema-publico")).toBeNull();
  });
});
