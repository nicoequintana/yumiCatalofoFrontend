import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `useCarrito` no expone un `vaciar` estático: es un método del objeto que
// devuelve el hook. Mockeamos el módulo entero para controlar `cantidadTotal`
// por caso, sin tocar `localStorage` (en este repo `globalThis.localStorage`
// es un objeto vacío sin métodos). Mismo patrón que `Footer.test.jsx`.
const carritoMock = vi.fn();
vi.mock("../hooks/useCarrito.js", () => ({ default: () => carritoMock() }));

const { default: NavFlotante } = await import("./NavFlotante.jsx");

function montar(ruta = "/", props = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <NavFlotante menuAbierto={false} onAlternarMenu={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  carritoMock.mockReturnValue({ cantidadTotal: 0 });
});

describe("NavFlotante", () => {
  it("tiene cuatro ranuras, en el orden acordado", () => {
    montar();

    const nombres = screen
      .getAllByRole("button")
      .concat(screen.getAllByRole("link"))
      .map((el) => el.getAttribute("aria-label"));

    expect(nombres).toEqual(
      expect.arrayContaining(["Inicio", "Buscar productos", "Ver carrito", "Abrir menú"]),
    );
  });

  it("marca la ranura activa con aria-current, no solo con color", () => {
    montar("/");

    expect(screen.getByLabelText("Inicio")).toHaveAttribute("aria-current", "page");
  });

  it("no se muestra en el panel: /catalogo/admin/login usa el mismo Layout", () => {
    const { container } = montar("/catalogo/admin/login");

    expect(container).toBeEmptyDOMElement();
  });

  it("el globo del carrito no aparece con el carrito vacío", () => {
    montar();

    expect(screen.getByLabelText("Ver carrito")).not.toHaveTextContent(/\d/);
  });

  it("el globo del carrito aparece con el número de unidades", () => {
    carritoMock.mockReturnValue({ cantidadTotal: 3 });

    montar();

    expect(screen.getByLabelText("Ver carrito")).toHaveTextContent("3");
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

  // Migrado de `Navbar.test.jsx` ("el panel no está en el DOM hasta que se
  // abre"): el botón vivía ahí antes de mudarse a la isla.
  it("en su estado inicial el botón no está expandido", () => {
    montar("/", { menuAbierto: false });

    expect(screen.getByLabelText("Abrir menú")).toHaveAttribute("aria-expanded", "false");
  });

  it("solo existe por debajo de md: en escritorio manda el navbar", () => {
    const { container } = montar();

    expect(container.firstChild.className).toMatch(/\bmd:hidden\b/);
  });
});
