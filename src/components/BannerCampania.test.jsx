import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BannerCampania from "./BannerCampania.jsx";

const BANNER = {
  campaniaId: 7,
  doodleUrl: "https://res.cloudinary.com/demo/primavera.png",
  titulo: "Semana del Hogar",
  texto: "Hasta agotar stock.",
  ctaTexto: "Ver la selección",
  ctaDestino: "/coleccion?campania=7",
};

function montar(banner, props = {}) {
  return render(
    <MemoryRouter>
      <BannerCampania banner={banner} {...props} />
    </MemoryRouter>,
  );
}

describe("BannerCampania", () => {
  it("sin banner no renderiza nada: una franja vacía se lee como error de carga", () => {
    const { container } = montar(null);

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra el texto del banner tal cual, sin buscar ningún marcador", () => {
    montar(BANNER);

    expect(screen.getByText("Hasta agotar stock.")).toBeInTheDocument();
  });

  // El banner ya NO trae `diasFaltantes` (ese contador es del cartel, que
  // conserva `modalFechaObjetivo`). Sin la columna, un banner viejo que
  // todavía dependiera de esa clave pintaría "undefined días": la píldora se
  // saca del todo, no se la deja adivinar un valor ausente.
  it("no pinta ninguna píldora de días: el banner no tiene contador", () => {
    montar(BANNER);

    expect(screen.queryByText(/día/)).toBeNull();
    expect(screen.queryByText(/undefined/)).toBeNull();
  });

  it("el CTA lleva al destino que resolvió el backend", () => {
    montar(BANNER);

    expect(screen.getByRole("link", { name: "Ver la selección" })).toHaveAttribute(
      "href",
      "/coleccion?campania=7",
    );
  });

  it("sin destino no hay botón, y el banner sigue siendo legible", () => {
    montar({ ...BANNER, ctaDestino: null, ctaTexto: null });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Semana del Hogar")).toBeInTheDocument();
  });

  it("con interactivo apagado el CTA no navega", () => {
    const { container } = montar(BANNER, { interactivo: false });

    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Ver la selección")).toBeInTheDocument();
  });

  it("el arte va absolute inset-0 dentro de su caja con aspect-*", () => {
    const { container } = montar(BANNER);

    const img = container.querySelector("img");
    expect(img.className).toMatch(/\babsolute\b/);
    expect(img.className).toMatch(/\binset-0\b/);
  });

  it("sin arte cae a un placeholder de marca, nunca a un ícono roto", () => {
    const { container } = montar({ ...BANNER, doodleUrl: null });

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Semana del Hogar")).toBeInTheDocument();
  });
});
