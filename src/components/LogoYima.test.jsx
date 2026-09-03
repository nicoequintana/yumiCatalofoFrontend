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

describe("LogoYima con Doodle de campaña", () => {
  const DOODLE = "https://res.cloudinary.com/demo/image/upload/primavera.png";

  it("muestra el Doodle en lugar del logo cuando la campaña lo aporta", () => {
    render(<LogoYima doodleUrl={DOODLE} />);
    expect(screen.getByRole("img", { name: "YIMA" })).toHaveAttribute("src", DOODLE);
  });

  it("sin Doodle vuelve al logo normal", () => {
    // El contrato de "si no hay campaña activa, YIMA se comporta exactamente
    // como antes". `null` y `undefined` tienen que dar los dos el logo de marca.
    render(<LogoYima doodleUrl={null} />);
    expect(screen.getByRole("img", { name: "YIMA" })).toHaveAttribute("src", "/logo-yima-160.png");
  });

  it("el Doodle CONSERVA el nombre accesible de la marca", () => {
    // El `alt` es el nombre accesible del link a la home. Un Doodle que lo
    // pierda deja ese link sin nombre para un lector de pantalla — una campaña
    // de temporada no puede degradar la accesibilidad del sitio.
    render(<LogoYima doodleUrl={DOODLE} />);
    expect(screen.getByRole("img", { name: "YIMA" })).toBeInTheDocument();
  });

  it("el Doodle NO arrastra el <source> WebP del logo de marca", () => {
    // El `srcSet` del WebP apunta al archivo estático de la marca. Dejarlo
    // puesto haría que un navegador con soporte WebP —o sea, todos— siguiera
    // mostrando el logo viejo y el Doodle no se viera nunca.
    const { container } = render(<LogoYima doodleUrl={DOODLE} />);
    expect(container.querySelector("source")).toBeNull();
  });

  it("el Doodle sigue reservando el espacio del encabezado", () => {
    // Sin dimensiones intrínsecas el header sticky salta al terminar la carga.
    // El Doodle es una imagen remota: es MÁS propenso a ese salto, no menos.
    render(<LogoYima doodleUrl={DOODLE} />);
    const img = screen.getByRole("img", { name: "YIMA" });
    expect(img).toHaveAttribute("width", "470");
    expect(img).toHaveAttribute("height", "160");
  });

  it("el Doodle mantiene la clase del realce en tema oscuro", () => {
    render(<LogoYima doodleUrl={DOODLE} className="h-7" />);
    const img = screen.getByRole("img", { name: "YIMA" });
    expect(img).toHaveClass("logo-yima");
    expect(img).toHaveClass("h-7");
  });

  it("un Doodle decorativo se oculta del árbol de accesibilidad igual que el logo", () => {
    render(<LogoYima doodleUrl={DOODLE} decorativo />);
    expect(screen.queryByRole("img", { name: "YIMA" })).not.toBeInTheDocument();
  });
});
