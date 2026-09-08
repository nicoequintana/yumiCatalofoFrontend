import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import NoEncontradoAdmin from "./NoEncontradoAdmin.jsx";

function renderPantalla() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/categorias"]}>
      <NoEncontradoAdmin />
    </MemoryRouter>,
  );
}

describe("NoEncontradoAdmin", () => {
  it("ofrece volver a Productos, no a la tienda", () => {
    renderPantalla();

    const salida = screen.getByRole("link", { name: /productos/i });
    expect(salida).toHaveAttribute("href", "/catalogo/admin/productos");

    // El 404 público manda a `/coleccion`: quien se equivoca tipeando una URL
    // del panel está trabajando, y sacarlo a la tienda le cuesta volver a
    // entrar por la puerta de adelante.
    expect(screen.queryByRole("link", { name: /ver todos los productos/i })).toBeNull();
  });

  it("se anuncia como un error, no como contenido", () => {
    renderPantalla();

    expect(screen.getByRole("alert")).toHaveTextContent(/no encontramos esa pantalla/i);
  });
});

/**
 * El catch-all público (`path="*"` dentro del `Layout`) atrapaba TODA URL del
 * panel que no matcheara una ruta real: `/catalogo/admin/categorias` —plausible,
 * la real es `/catalogo/admin/configuracion/categorias`— caía en el 404 de la
 * tienda, con Navbar, Footer y un único CTA hacia el catálogo público.
 *
 * React Router resuelve por especificidad y no por orden de declaración, así
 * que `/catalogo/admin/*` (dos segmentos estáticos) le gana al `*` pelado, y
 * `/catalogo/admin/login` (tres estáticos) le gana al splat del admin. Los
 * paths van literales, igual que en `App.jsx`: el repo no tiene un módulo de
 * rutas del que importarlos.
 */
describe("ruteo del catch-all del panel", () => {
  function renderRutas(ruta) {
    return render(
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/catalogo/admin/login" element={<p>login del panel</p>} />
          <Route path="/catalogo/admin/productos" element={<p>listado de productos</p>} />
          <Route path="/catalogo/admin/*" element={<p>404 del panel</p>} />
          <Route path="*" element={<p>404 público</p>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("una URL inventada del panel no cae en el 404 público", () => {
    renderRutas("/catalogo/admin/categorias");

    expect(screen.getByText("404 del panel")).toBeInTheDocument();
    expect(screen.queryByText("404 público")).toBeNull();
  });

  it("no le roba el login ni las pantallas reales", () => {
    renderRutas("/catalogo/admin/login");
    expect(screen.getByText("login del panel")).toBeInTheDocument();

    renderRutas("/catalogo/admin/productos");
    expect(screen.getByText("listado de productos")).toBeInTheDocument();
  });

  it("deja intacto el 404 público", () => {
    renderRutas("/una-url-inventada");

    expect(screen.getByText("404 público")).toBeInTheDocument();
  });
});
