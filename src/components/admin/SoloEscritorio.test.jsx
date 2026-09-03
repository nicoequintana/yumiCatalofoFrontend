import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import SoloEscritorio from "./SoloEscritorio.jsx";

function montar(children = <p>contenido del módulo</p>) {
  return render(
    <MemoryRouter>
      <SoloEscritorio titulo="Campañas">{children}</SoloEscritorio>
    </MemoryRouter>,
  );
}

describe("SoloEscritorio", () => {
  it("renderiza el contenido dentro de un contenedor que solo existe en lg+", () => {
    const { container } = montar();

    const envoltorio = screen.getByText("contenido del módulo").closest("div");
    expect(envoltorio).toHaveClass("hidden");
    expect(envoltorio).toHaveClass("lg:block");
    expect(container).toBeTruthy();
  });

  it("muestra el aviso solo por debajo de lg", () => {
    montar();

    const aviso = screen.getByRole("status");
    expect(aviso).toHaveClass("lg:hidden");
    expect(aviso).toHaveTextContent(/pantalla más grande/i);
  });

  it("el aviso nombra el módulo, para que se entienda a qué se refiere", () => {
    montar();

    expect(screen.getByRole("status")).toHaveTextContent(/Campañas/);
  });

  it("ofrece una salida a una pantalla que sí funciona en el celular", () => {
    // Un cartel sin salida deja a la persona atrapada: llegó por una URL y la
    // única navegación del drawer no incluye este módulo.
    montar();

    const salida = screen.getByRole("link", { name: /productos/i });
    expect(salida).toHaveAttribute("href", "/catalogo/admin/productos");
  });

  it("NO usa matchMedia: la decisión es de CSS, no de JavaScript", () => {
    // jsdom no implementa matchMedia, así que si el componente lo llamara este
    // render explotaría. Es la forma más directa de afirmar la regla del
    // proyecto: el frontend no tiene ningún breakpoint en JS.
    expect(() => montar()).not.toThrow();
  });
});
