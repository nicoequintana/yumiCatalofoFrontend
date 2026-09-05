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
