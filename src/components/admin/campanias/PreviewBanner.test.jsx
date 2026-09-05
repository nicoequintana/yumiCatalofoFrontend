import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PreviewBanner from "./PreviewBanner.jsx";

const BANNER = {
  titulo: "Semana del Hogar",
  texto: "Hasta 30 % en cocina, deco e iluminación.",
  ctaTexto: "Ver la selección",
  ctaDestino: "/coleccion",
  doodleUrl: null,
};

describe("PreviewBanner", () => {
  it("muestra el banner con el copy tipeado", () => {
    render(<PreviewBanner banner={BANNER} />);

    expect(screen.getByText("Semana del Hogar")).toBeInTheDocument();
    expect(screen.getByText(/Hasta 30 %/)).toBeInTheDocument();
  });

  it("el CTA se dibuja pero NO navega: es un preview, no la home", () => {
    const { container } = render(<PreviewBanner banner={BANNER} />);

    expect(screen.getByText("Ver la selección")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
  });

  it("fuerza la paleta clara: el catálogo público no tiene tema oscuro", () => {
    const { container } = render(<PreviewBanner banner={BANNER} />);

    expect(container.querySelector(".paleta-clara")).not.toBeNull();
  });

  it("no fija alto propio: el copy lo escribe el admin y puede crecer", () => {
    const { container } = render(<PreviewBanner banner={BANNER} />);

    const panel = container.querySelector('[data-testid="preview-banner"]');
    expect(panel.className).not.toMatch(/\bh-\[|\bh-\d|\bmax-h-/);
  });
});
