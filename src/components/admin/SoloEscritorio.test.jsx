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

/**
 * Área táctil (WCAG 2.5.8). Medido en navegador el 07/09/2026 sobre
 * `/catalogo/admin/campanias` y `/promociones` a 390×844 con `elementFromPoint`
 * —el área EFECTIVA, no la caja declarada—: el CTA daba **41 de alto**.
 *
 * El aviso vive JUSTO en el breakpoint donde importa: es lo único que se ve de
 * estas dos pantallas en un celular, así que su único botón era un control de
 * 41px en la superficie más táctil del panel. `NoEncontradoAdmin.jsx`, que es
 * el mismo patrón de página vacía con una salida, ya declaraba
 * `inline-flex min-h-11 items-center`: acá se aplica el mismo.
 */
describe("SoloEscritorio — área táctil", () => {
  it("la salida a Productos declara el mínimo táctil de 44 de alto", () => {
    montar();

    const enlace = screen.getByRole("link", { name: "Ir a Productos" });

    expect(enlace.className.split(" ")).toContain("min-h-11");
    // `inline-flex` es lo que hace que un `<a>` respete la altura mínima: en
    // `display:inline` se ignora y el arreglo no haría nada.
    expect(enlace.className.split(" ")).toContain("inline-flex");
  });
});
