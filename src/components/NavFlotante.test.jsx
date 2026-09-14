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

  it("se alinea con el FAB de WhatsApp: mismo borde derecho (16px) y mismo ancho (56px)", () => {
    const { container } = montar();
    const wrapper = container.firstChild;
    const pildora = wrapper.firstChild;

    // `BotonWhatsapp` (fab) es `right-4` y `h-14 w-14`: el wrapper de la isla
    // tiene que dejar la píldora a los mismos 16px del borde (mockup
    // `.wa`/`.menu-flotante`, los dos `right:16px`), no a `px-margin-mobile`
    // (20px). Y la píldora mide 44 + 2×5 de padding + 2×1 de borde = 56px:
    // con `p-1.5` medía 58 y los centros quedaban corridos 1px.
    expect(wrapper).toHaveClass("pr-4");
    expect(wrapper.className).not.toMatch(/(^|\s)px-margin-mobile(\s|$)/);
    expect(pildora).toHaveClass("p-[5px]", "border");
    expect(pildora).not.toHaveClass("p-1.5");
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

  // El alfa tiene un PISO, y el guard afirma la REGLA, no el valor: clavar
  // `/70` literal convertía cada ajuste de diseño en un test roto que no
  // señalaba ningún problema real.
  //
  // El piso es 3:1 y no 4,5:1 porque lo único que va sobre este vidrio es el
  // ícono de un control — WCAG 1.4.11 (Non-text Contrast), no 1.4.3, que es el
  // que rige en `Navbar.jsx` porque ahí arriba hay texto.
  //
  // Compuesto contra blanco (el peor caso: el blur difumina el fondo pero no
  // lo aclara), con el crema encima. Con la paleta de `.tema-publico` (T1 del
  // rediseño del 13/09/2026: `inverse-surface` #31302c, crema #fdf9f2) el
  // piso SUBIÓ de `/50` a `/55`, porque el gris nuevo es más claro que el
  // #1d1b1a de antes:
  //   /70 → 4,85:1   /60 → 3,62:1   /55 → 3,16:1   /50 → 2,77:1 ← se rompe
  // (con la paleta vieja era /55 → 3,65:1 y /50 → 3,15:1).
  // Calculado con la fórmula de luminancia relativa de WCAG, no a ojo.
  it("el alfa del vidrio no baja del piso de 3:1", () => {
    const { container } = montar();
    const pastilla = container.querySelector(".vidrio-isla");

    const alfa = pastilla.className.match(/bg-inverse-surface\/(\d+)/)?.[1];
    expect(alfa).toBeDefined();
    expect(Number(alfa)).toBeGreaterThanOrEqual(55);
  });

  it("es vidrio: lleva desenfoque y un canto visible", () => {
    const { container } = montar();
    const pastilla = container.querySelector(".vidrio-isla");

    expect(pastilla.className).toMatch(/backdrop-blur/);
    expect(pastilla.className).toMatch(/\bborder\b/);
    // `.vidrio-isla` es el fallback de `index.css`: sin `backdrop-filter` el
    // fondo pasa a opaco, porque un alfa así de bajo con el contenido NÍTIDO
    // por detrás es peor que no haber intentado el efecto.
    expect(pastilla).toHaveClass("vidrio-isla");
  });
});
