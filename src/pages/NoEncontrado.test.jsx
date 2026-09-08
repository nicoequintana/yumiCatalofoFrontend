import { describe, expect, it, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NoEncontrado from "./NoEncontrado.jsx";

afterEach(cleanup);

describe("NoEncontrado", () => {
  it("lleva noindex", () => {
    render(<MemoryRouter><NoEncontrado /></MemoryRouter>);

    expect(document.head.querySelector('meta[name="robots"]').getAttribute("content"))
      .toBe("noindex, follow");
  });

  it("ofrece una salida al catálogo", () => {
    render(<MemoryRouter><NoEncontrado /></MemoryRouter>);

    expect(screen.getByRole("link", { name: /productos/i })).toHaveAttribute("href", "/coleccion");
  });

  it("declara un h1", () => {
    const { container } = render(<MemoryRouter><NoEncontrado /></MemoryRouter>);
    expect(container.querySelector("h1")).not.toBe(null);
  });
});

/**
 * Área táctil (WCAG 2.5.8). Medido en navegador el 07/09/2026 con
 * `elementFromPoint` —el área EFECTIVA, no la caja declarada—: el CTA daba
 * **42px de alto** a 390 y a 1280 (`py-3` sobre un texto de 17px). Es un botón
 * suelto en una página vacía, así que puede crecer los 2px que faltan sin
 * costo: `min-h-11` como PISO, y el `py-3` se conserva porque es lo que le da
 * el aire horizontal.
 */
describe("NoEncontrado — área táctil", () => {
  it("el CTA al catálogo declara el mínimo táctil de 44px", () => {
    render(<MemoryRouter><NoEncontrado /></MemoryRouter>);

    const enlace = screen.getByRole("link", { name: /productos/i });

    expect(enlace.className.split(" ")).toContain("min-h-11");
  });
});
