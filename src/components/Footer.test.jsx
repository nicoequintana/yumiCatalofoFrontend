import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoMock = vi.fn();
vi.mock("../hooks/useContextoComercial.js", () => ({ default: () => contextoMock() }));

const { default: Footer } = await import("./Footer.jsx");

const VACIO = { doodle: null, doodleAdmin: null, modal: null, claveDia: null, resuelto: true };
const PUBLICO = "https://res.cloudinary.com/demo/primavera.png";
const DEL_PANEL = "https://res.cloudinary.com/demo/panel.png";

function montar(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Footer />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  contextoMock.mockReturnValue(VACIO);
});

describe("Footer", () => {
  it("sin campaña activa pinta el wordmark de siempre", () => {
    montar();

    expect(screen.getByAltText("YIMA")).toHaveAttribute("src", "/logo-yima-160.png");
  });

  it("con campaña activa el logo del pie también es el Doodle", () => {
    // El pie y el encabezado son la misma marca en la misma página: que uno
    // lleve el arte de la campaña y el otro el wordmark de siempre se lee como
    // un error de carga, no como una decisión.
    contextoMock.mockReturnValue({ ...VACIO, doodle: { url: PUBLICO } });

    montar();

    expect(screen.getByAltText("YIMA")).toHaveAttribute("src", PUBLICO);
  });

  it("en el login del panel aplica la MISMA regla que el navbar", () => {
    // `/catalogo/admin/login` usa este mismo Layout. Si el pie mirara siempre
    // el Doodle público, esa página mostraría dos artes distintos a la vez.
    contextoMock.mockReturnValue({
      ...VACIO,
      doodle: { url: PUBLICO },
      doodleAdmin: { url: DEL_PANEL },
    });

    montar("/catalogo/admin/login");

    expect(screen.getByAltText("YIMA")).toHaveAttribute("src", DEL_PANEL);
  });

  it("una campaña que no eligió aparecer en el panel deja el wordmark ahí", () => {
    contextoMock.mockReturnValue({ ...VACIO, doodle: { url: PUBLICO }, doodleAdmin: null });

    montar("/catalogo/admin/login");

    expect(screen.getByAltText("YIMA")).toHaveAttribute("src", "/logo-yima-160.png");
  });
});
