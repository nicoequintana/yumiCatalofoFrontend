import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PreviewBanner from "./PreviewBanner.jsx";

const SLIDE = {
  tipo: "CAMPANIA",
  campaniaId: 7,
  titulo: "Semana del Hogar",
  texto: "Hasta 30 % en cocina, deco e iluminación.",
  ctaDestino: "/coleccion",
  arteUrl: null,
  doodleUrl: null,
};


describe("PreviewBanner", () => {
  it("muestra el slide, sin copy visible: el texto vive en la imagen (decisión 2026-09-14)", () => {
    // Hasta el 13/09/2026 el título y el texto se leían acá. Con el campo
    // oculto en el panel y el copy retirado de `SlideCampania`, el preview
    // muestra el molde de marca (sin arte en este fixture) y nada de texto.
    const { container } = render(<PreviewBanner slide={SLIDE} />);

    expect(screen.queryByText("Semana del Hogar")).toBeNull();
    expect(screen.queryByText(/Hasta 30 %/)).toBeNull();
    expect(container.querySelector(".bg-primary")).not.toBeNull();
  });

  it("NO navega: es un preview, no la home", () => {
    // El slide entero es un `<Link>` en la home; acá el admin está editando, así
    // que `PreviewBanner` pasa `interactivo={false}` y no tiene que haber
    // ningún ancla — un click accidental no puede sacarlo del editor.
    const { container } = render(<PreviewBanner slide={SLIDE} />);

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
    expect(screen.queryByText(SLIDE.texto)).toBeNull();
  });
});
