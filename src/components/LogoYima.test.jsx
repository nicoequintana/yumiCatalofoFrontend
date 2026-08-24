import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LogoYima from "./LogoYima";

describe("LogoYima", () => {
  it("expone 'YIMA' como nombre accesible", () => {
    render(<LogoYima />);
    expect(screen.getByRole("img", { name: "YIMA" })).toBeInTheDocument();
  });

  it("declara las dimensiones intrínsecas para reservar el espacio antes de cargar", () => {
    render(<LogoYima />);
    const img = screen.getByRole("img", { name: "YIMA" });
    expect(img).toHaveAttribute("width", "470");
    expect(img).toHaveAttribute("height", "160");
  });

  it("carga sin diferir: el logo vive en el encabezado, sobre el pliegue", () => {
    render(<LogoYima />);
    expect(screen.getByRole("img", { name: "YIMA" })).toHaveAttribute("loading", "eager");
  });

  it("ofrece el WebP con el PNG como alternativa", () => {
    const { container } = render(<LogoYima />);
    expect(container.querySelector("source")).toHaveAttribute("type", "image/webp");
    expect(screen.getByRole("img", { name: "YIMA" })).toHaveAttribute(
      "src",
      "/logo-yima-160.png",
    );
  });

  it("puede ocultarse del árbol de accesibilidad cuando es decorativo", () => {
    render(<LogoYima decorativo />);
    expect(screen.queryByRole("img", { name: "YIMA" })).not.toBeInTheDocument();
  });

  it("acepta clases de tamaño sin perder la clase que engancha el realce del tema oscuro", () => {
    render(<LogoYima className="h-10" />);
    const img = screen.getByRole("img", { name: "YIMA" });
    expect(img).toHaveClass("h-10");
    expect(img).toHaveClass("logo-yima");
  });
});
