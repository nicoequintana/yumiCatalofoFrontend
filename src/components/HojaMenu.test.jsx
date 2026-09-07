import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

// Espía en vez de un stub pelado: hay un test que afirma CON QUÉ se lo llama,
// no solo qué devuelve.
const categoriasMock = vi.fn(() => ({
  categorias: [{ id: 1002, nombre: "Cocina", cantidadPublicados: 27 }],
  resuelto: true,
}));

vi.mock("../hooks/useCategoriasNavbar.js", () => ({
  default: (...args) => categoriasMock(...args),
}));

// Mismo patrón que `Navbar.test.jsx`: mockeamos el módulo entero para
// controlar `cantidadTotal` sin depender de `localStorage`, que en este
// entorno de test es un objeto vacío sin métodos.
const carritoMock = vi.fn(() => ({ cantidadTotal: 0 }));
vi.mock("../hooks/useCarrito.js", () => ({ default: () => carritoMock() }));

const { default: HojaMenu } = await import("./HojaMenu.jsx");

function montar(props = {}, ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <HojaMenu abierta onCerrar={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe("HojaMenu", () => {
  it("cerrada no está en el DOM: dos copias montadas duplican cada destino", () => {
    const { container } = montar({ abierta: false });

    expect(container).toBeEmptyDOMElement();
  });

  it("es un diálogo con nombre propio", () => {
    montar();

    expect(screen.getByRole("dialog", { name: "Menú" })).toBeInTheDocument();
  });

  it("lleva todos los destinos, más las categorías", () => {
    montar();

    expect(screen.getByRole("link", { name: "Inicio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /favoritos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /todos los productos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /cocina/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Carrito" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buscar" })).toBeInTheDocument();
  });

  it("Escape cierra", async () => {
    const usuario = userEvent.setup();
    const cerrar = vi.fn();
    montar({ onCerrar: cerrar });

    await usuario.keyboard("{Escape}");

    expect(cerrar).toHaveBeenCalled();
  });

  it("nace abajo, que es de donde viene el gesto", () => {
    montar();

    expect(screen.getByRole("dialog", { name: "Menú" }).className).toMatch(/\bbottom-0\b/);
  });

  // Antes la hoja era `max-h-[85vh]` anclada abajo, así que su borde superior lo
  // decidía el alto del viewport y no el header: quedaba una franja del fondo
  // oscurecido entre el navbar y la hoja (23 px en un Pixel 7) que se lee como
  // un hueco. Ahora el tope se MIDE contra el header, porque su posición cambia
  // con el scroll (al tope cuelga bajo la cinta de anuncios; scrolleado queda
  // pegado bajo la cinta de ambiente).
  it("arranca justo donde termina el header, sin dejar hueco", () => {
    const header = document.createElement("header");
    document.body.appendChild(header);
    header.getBoundingClientRect = () => ({ bottom: 114, top: 38, height: 76 });

    montar();

    const hoja = screen.getByRole("dialog", { name: "Menú" });
    expect(hoja).toHaveStyle({ top: "114px" });
    // El alto ya no lo fija el viewport: lo define la distancia entre ese tope
    // y el borde inferior.
    expect(hoja.className).not.toMatch(/max-h-\[85vh\]/);

    header.remove();
  });

  it("sin header cae a cero en vez de romperse", () => {
    montar();

    expect(screen.getByRole("dialog", { name: "Menú" })).toHaveStyle({ top: "0px" });
  });

  // Migrado de `Navbar.test.jsx` ("cerrar el panel devuelve el scroll del
  // documento"): el panel móvil vivía ahí y bloqueaba el scroll del body con
  // el mismo `useBloquearScroll` que usa ahora esta hoja.
  it("bloquea el scroll del body mientras está abierta y lo devuelve al cerrarse", () => {
    const { rerender } = render(
      <MemoryRouter>
        <HojaMenu abierta onCerrar={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <MemoryRouter>
        <HojaMenu abierta={false} onCerrar={vi.fn()} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  // Migrado de `Navbar.test.jsx` ("el link de favoritos del panel no
  // colisiona con el del header"): el corazón del header (`Navbar`) se rotula
  // "Ver favoritos" y este, a secas, "Favoritos" — nombres accesibles
  // distintos aunque los dos terminen montados a la vez (la isla y la hoja
  // conviven con el header en `Layout`), así que `getByRole` en cualquiera de
  // los dos sigue devolviendo un solo nodo.
  it("el link de Favoritos se llama distinto del corazón del header", () => {
    montar();

    expect(screen.getByRole("link", { name: "Favoritos" })).toHaveAttribute("href", "/favoritos");
    expect(screen.queryByRole("link", { name: /ver favoritos/i })).not.toBeInTheDocument();
  });

  // Sumado en el reparto del 05/09/2026: sin esto, la ficha de producto en
  // móvil (donde `Navbar` se esconde) no tenía NINGÚN camino al carrito.
  // Mismo criterio que Favoritos: el nombre accesible NO copia el "Ver
  // carrito" del header, porque los dos se montan a la vez en `Layout`.
  describe("fila de Carrito", () => {
    it("linkea a /carrito con un nombre que no colisiona con el del header", () => {
      montar();

      expect(screen.getByRole("link", { name: "Carrito" })).toHaveAttribute("href", "/carrito");
      expect(screen.queryByRole("link", { name: /ver carrito/i })).not.toBeInTheDocument();
    });

    // Migrado de `NavFlotante.test.jsx`: el globo del carrito vivía en la isla
    // y se mudó acá junto con la fila que lo muestra.
    it("no muestra el globo cuando el carrito está vacío", () => {
      carritoMock.mockReturnValue({ cantidadTotal: 0 });
      montar();

      expect(screen.getByRole("link", { name: "Carrito" })).not.toHaveTextContent(/\d/);
    });

    it("muestra el globo con la cantidad cuando el carrito tiene ítems", () => {
      carritoMock.mockReturnValue({ cantidadTotal: 3 });
      montar();

      // Con el globo puesto el nombre accesible pasa a ser "Carrito 3" (el
      // número entra en el cómputo del nombre): se busca por coincidencia
      // parcial, no por el nombre exacto que usan los demás casos.
      expect(screen.getByRole("link", { name: /carrito/i })).toHaveTextContent("3");
    });
  });

  // El nombre "Buscar" (y no "Buscar productos") es lo mismo que ya resuelve
  // Favoritos: la lupa del header vive también en móvil desde este reparto y
  // se monta junto con la hoja, así que copiar su nombre accesible acá
  // rompería los `getByRole` singulares de este mismo contrato.
  it("la fila de Buscar lleva a /coleccion con un nombre que no colisiona con la lupa del header", () => {
    montar();

    expect(screen.getByRole("link", { name: "Buscar" })).toHaveAttribute("href", "/coleccion");
    expect(screen.queryByRole("link", { name: "Buscar productos" })).not.toBeInTheDocument();
  });

  // Mismo guard que `NavFlotante`: `/catalogo/admin/login` se renderiza dentro
  // del mismo `Layout` público, y sin este guard la hoja se montaría encima
  // de esa pantalla aunque nadie la haya abierto desde ahí.
  it("no se monta en el panel: /catalogo/admin/login usa el mismo Layout", () => {
    const { container } = montar({}, "/catalogo/admin/login");

    expect(container).toBeEmptyDOMElement();
  });

  // El `return null` de arriba NO alcanza para ahorrarse la request: las reglas
  // de hooks obligan a llamar a `useCategoriasNavbar` antes de cualquier salida
  // temprana, así que su efecto corre igual. La bandera `activo` es lo único
  // que apaga el fetch, y sin ella `/catalogo/admin/login` pedía `/categorias`
  // en cada carga — la misma request que `Navbar` ya se ahorra.
  it("en el panel no dispara el fetch de categorías, no solo no las muestra", () => {
    categoriasMock.mockClear();
    montar({}, "/catalogo/admin/login");

    expect(categoriasMock).toHaveBeenCalledWith({ activo: false });
  });

  it("en una ruta pública sí lo dispara", () => {
    categoriasMock.mockClear();
    montar();

    expect(categoriasMock).toHaveBeenCalledWith({ activo: true });
  });
});
