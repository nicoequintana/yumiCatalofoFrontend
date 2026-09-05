import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const { default: NavFlotante } = await import("./NavFlotante.jsx");

function montar(ruta = "/", props = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <NavFlotante menuAbierto={false} onAlternarMenu={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

// Reparto del 05/09/2026: Inicio, Buscar y Carrito se retiran de la isla.
// Buscar y Carrito vuelven a la barra (`Navbar.test.jsx`, visible ahora
// también en móvil); Carrito además se suma a `HojaMenu` (`HojaMenu.test.jsx`,
// que es donde se migró la cobertura del globo). El `aria-current` de Inicio
// NO se migra a ningún lado: era la marca de una ranura que se retiró entera,
// no una feature que sobreviva bajo otra forma — el logo (link a "/") ya
// cubre volver al inicio.
describe("NavFlotante", () => {
  it("tiene una sola ranura: la hamburguesa", () => {
    montar();

    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByRole("button")).toHaveAttribute("aria-controls", "hoja-menu");
  });

  it("no se muestra en el panel: /catalogo/admin/login usa el mismo Layout", () => {
    const { container } = montar("/catalogo/admin/login");

    expect(container).toBeEmptyDOMElement();
  });

  // La ficha tiene su propia barra de compra fija abajo (precio, cantidad y
  // "Agregar al carrito"): la píldora se le montaba encima y tapaba el botón,
  // o sea que la navegación le estaba comiendo la conversión a la pantalla que
  // vende. El carrito y favoritos siguen alcanzables desde el header, que ahí
  // sí se muestra.
  it("no se muestra en la ficha de producto: ahí manda la barra de compra", () => {
    const { container } = montar("/producto/123-lampara-de-sal");

    expect(container).toBeEmptyDOMElement();
  });

  it("el botón de menú avisa al padre y refleja el estado abierto", async () => {
    const usuario = userEvent.setup();
    const alternar = vi.fn();
    montar("/", { onAlternarMenu: alternar });

    await usuario.click(screen.getByLabelText("Abrir menú"));

    expect(alternar).toHaveBeenCalledTimes(1);
  });

  it("con el menú abierto el botón se rotula Cerrar", () => {
    montar("/", { menuAbierto: true });

    expect(screen.getByLabelText("Cerrar menú")).toHaveAttribute("aria-expanded", "true");
  });

  it("en su estado inicial el botón no está expandido", () => {
    montar("/", { menuAbierto: false });

    expect(screen.getByLabelText("Abrir menú")).toHaveAttribute("aria-expanded", "false");
  });

  it("solo existe por debajo de md: en escritorio manda el navbar", () => {
    const { container } = montar();

    expect(container.firstChild.className).toMatch(/\bmd:hidden\b/);
  });

  it("flota a la derecha, no centrada: es donde cae el pulgar", () => {
    const { container } = montar();

    expect(container.firstChild).toHaveClass("justify-end");
    expect(container.firstChild).not.toHaveClass("justify-center");
  });

  // `HojaMenu` es `fixed … bottom-0` con el mismo z-index base que la isla, y
  // se monta DESPUÉS en el DOM: sin subir la isla, la hoja pinta encima y su
  // botón de cerrar (acá arriba) queda invisible y no clickeable.
  it("con el menú abierto sube de z-index para ganarle a la hoja", () => {
    const { container: cerrado } = montar("/", { menuAbierto: false });
    expect(cerrado.firstChild.className).toMatch(/\bz-40\b/);
    expect(cerrado.firstChild.className).not.toMatch(/\bz-50\b/);

    const { container: abierto } = montar("/", { menuAbierto: true });
    expect(abierto.firstChild.className).toMatch(/\bz-50\b/);
  });

  // El alfa tiene un PISO de contraste (ver `Navbar.jsx`, mismo cálculo): no
  // puede bajar de `/70`. El desenfoque tiene que notarse más que el del
  // header (acá el fondo es oscuro y el efecto vidrio es el único lenguaje
  // visual de la isla).
  it("el vidrio no baja del piso de contraste y lleva blur + borde", () => {
    const { container } = montar();
    const pastilla = container.querySelector(".vidrio-isla");

    expect(pastilla).toHaveClass("bg-inverse-surface/70");
    expect(pastilla).not.toHaveClass("bg-inverse-surface/90");
    expect(pastilla).not.toHaveClass("bg-inverse-surface/50");
    expect(pastilla.className).toMatch(/backdrop-blur/);
    expect(pastilla.className).toMatch(/\bborder\b/);
  });
});
