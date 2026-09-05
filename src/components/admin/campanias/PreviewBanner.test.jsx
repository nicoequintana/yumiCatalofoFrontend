import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PreviewBanner from "./PreviewBanner.jsx";

const SLIDE = {
  tipo: "CAMPANIA",
  campaniaId: 7,
  titulo: "Semana del Hogar",
  texto: "Hasta 30 % en cocina, deco e iluminación.",
  ctaTexto: "Ver la selección",
  ctaDestino: "/coleccion",
  arteUrl: null,
  doodleUrl: null,
  color: "TERRACOTA",
};

describe("PreviewBanner", () => {
  it("muestra el slide con el copy tipeado", () => {
    render(<PreviewBanner slide={SLIDE} />);

    expect(screen.getByText("Semana del Hogar")).toBeInTheDocument();
    expect(screen.getByText(/Hasta 30 %/)).toBeInTheDocument();
  });

  it("el CTA se dibuja pero NO navega: es un preview, no la home", () => {
    const { container } = render(<PreviewBanner slide={SLIDE} />);

    expect(screen.getByText("Ver la selección")).toBeInTheDocument();
    expect(container.querySelector("a")).toBeNull();
  });

  it("fuerza la paleta clara: el catálogo público no tiene tema oscuro", () => {
    const { container } = render(<PreviewBanner slide={SLIDE} />);

    expect(container.querySelector(".paleta-clara")).not.toBeNull();
  });

  it("no fija alto propio: el copy lo escribe el admin y puede crecer", () => {
    const { container } = render(<PreviewBanner slide={SLIDE} />);

    const panel = container.querySelector('[data-testid="preview-banner"]');
    expect(panel.className).not.toMatch(/\bh-\[|\bh-\d|\bmax-h-/);
  });

  it("sin título todavía no dibuja el slide, solo el esqueleto", () => {
    const { container } = render(<PreviewBanner slide={{ ...SLIDE, titulo: "" }} />);

    expect(container.querySelector('[data-testid="preview-banner"]')).not.toBeNull();
    expect(screen.queryByText("Ver la selección")).toBeNull();
  });
});
