import { render, screen } from "@testing-library/react";
import { computeAccessibleName } from "dom-accessibility-api";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import HojaMenu from "./HojaMenu.jsx";
import Navbar from "./Navbar.jsx";
import NavFlotante from "./NavFlotante.jsx";

/**
 * `Navbar`, `NavFlotante` y `HojaMenu` se montan A LA VEZ en `Layout.jsx` — acá
 * se ensayan juntos, sin el resto del shell (`BarraAnuncios`, `Footer`,
 * `CampaniaModalMontado`), que no participan de este contrato.
 *
 * Cubre la regresión que motivó el reparto del 05/09/2026: en la ficha de
 * producto (`esFichaProducto`) el header desaparece por debajo de `md`, así
 * que la hoja pasa a ser la ÚNICA navegación ahí. Sin un link a `/carrito`
 * dentro de la hoja, alguien que agrega algo al carrito desde la ficha no
 * tenía ningún camino de vuelta.
 */

vi.mock("../hooks/useCategoriasNavbar.js", () => ({
  default: () => ({ categorias: [], resuelto: true }),
}));

const cantidadTotalMock = vi.fn(() => 0);
vi.mock("../hooks/useCarrito.js", () => ({
  default: () => ({ cantidadTotal: cantidadTotalMock() }),
}));

function montarEnFicha() {
  return render(
    <MemoryRouter initialEntries={["/producto/123-lampara-de-sal"]}>
      <Navbar />
      <NavFlotante menuAbierto onAlternarMenu={vi.fn()} />
      <HojaMenu abierta onCerrar={vi.fn()} />
    </MemoryRouter>,
  );
}

describe("Navegación móvil de la ficha de producto", () => {
  it("el carrito es alcanzable desde la hoja aunque el header esté oculto", () => {
    montarEnFicha();

    // El header sigue en el DOM (jsdom no aplica `@media`), pero por debajo
    // de `md` es `display: none` en un navegador real — el camino real al
    // carrito en la ficha pasa por la hoja, no por el header.
    expect(screen.getByRole("link", { name: "Carrito" })).toHaveAttribute("href", "/carrito");
  });

  it("ningún nombre accesible se repite entre el header y la hoja montados juntos", () => {
    montarEnFicha();

    // El "Inicio"/"Productos" de escritorio (`nav aria-label="Navegación
    // principal"`) queda afuera del chequeo a propósito: es `hidden
    // md:flex`, así que en un navegador real nunca coexiste expuesto con la
    // hoja — jsdom no aplica `@media` y lo expondría igual, dando un falso
    // positivo (mismo motivo por el que `Navbar.test.jsx` ya lo aísla con
    // `within`, ver `navPrincipal()` ahí).
    const navEscritorio = screen.getByRole("navigation", { name: "Navegación principal" });
    const nodos = [...screen.getAllByRole("link"), ...screen.getAllByRole("button")].filter(
      (nodo) => !navEscritorio.contains(nodo),
    );
    const nombres = nodos.map((nodo) => computeAccessibleName(nodo)).filter(Boolean);

    const repetidos = nombres.filter((nombre, indice) => nombres.indexOf(nombre) !== indice);
    expect(repetidos).toEqual([]);
  });
});
