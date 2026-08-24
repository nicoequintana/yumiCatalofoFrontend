import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLayout from "./AdminLayout.jsx";

function PantallaQueRompe() {
  throw new Error("la pantalla del admin explotó");
}

/**
 * Igual que en `LimiteDeError.test.jsx`: React escupe por `console.error`
 * cada error atrapado por un límite. Se silencia solo acá y se restaura
 * después.
 */
let espiaConsola;

beforeEach(() => {
  espiaConsola = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  espiaConsola.mockRestore();
});

function renderAdmin(elementoDeLaPantalla) {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
      <Routes>
        <Route path="/catalogo/admin" element={<AdminLayout />}>
          <Route path="productos" element={elementoDeLaPantalla} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminLayout", () => {
  it("renderiza la pantalla del outlet junto con la navegación", () => {
    renderAdmin(<p>listado de productos</p>);

    expect(screen.getByText("listado de productos")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /órdenes/i }).length).toBeGreaterThan(0);
  });

  it("contiene el error de una pantalla sin desmontar la navegación", () => {
    renderAdmin(<PantallaQueRompe />);

    expect(screen.getByRole("alert")).toHaveTextContent(/esta pantalla no se pudo mostrar/i);

    // Lo importante: la sidebar sobrevive, así el admin puede irse a otra
    // sección en vez de quedar frente a una página en blanco.
    expect(screen.getAllByRole("link", { name: /órdenes/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /abrir menú/i })).toBeInTheDocument();
  });
});
