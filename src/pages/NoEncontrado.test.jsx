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
