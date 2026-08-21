import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Catalogo from "./Catalogo.jsx";
import Coleccion from "./Coleccion.jsx";
import * as productsApi from "../api/products.js";
import * as categoriasApi from "../api/categorias.js";

vi.mock("../api/products.js");
vi.mock("../api/categorias.js");

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
};

function renderPagina() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={["/"]}>
        <Catalogo />
      </MemoryRouter>
    </StrictMode>,
  );
}

/**
 * Sobre de página que devuelve `GET /products`. Los tests declaran las filas y
 * el helper arma el `{ data, page, pageSize, total }` alrededor.
 */
function pagina(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 12, total: filas.length, ...extra };
}

describe("Catalogo - home editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
  });

  it("muestra el hero con el copy de marca", () => {
    renderPagina();

    expect(screen.getByText("La Pregunta del Día")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "¿Qué vas a descubrir hoy?", level: 1 }),
    ).toBeInTheDocument();
  });

  it("el botón del hero es un link que navega a /coleccion", () => {
    renderPagina();

    const link = screen.getByRole("link", { name: "Explorar Colección" });
    expect(link).toHaveAttribute("href", "/coleccion");
  });

  // Complementa al test de `href` de arriba: ese sólo mira el atributo, así
  // que no detectaría que el link dejara de navegar de verdad (ej. si el
  // `Link` volviera a ser un `<a>` común con recarga completa, o si la ruta
  // no estuviera registrada). Antes de la separación esto era un scroll
  // dentro de la misma página; ahora es navegación entre rutas, que tiene
  // más formas de romperse.
  it("clickear el botón del hero renderiza la página de colección", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([]);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Catalogo />} />
            <Route path="/coleccion" element={<Coleccion />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await user.click(screen.getByRole("link", { name: "Explorar Colección" }));

    // Contenido propio de /coleccion, que la home ya no renderiza.
    expect(await screen.findByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByText("Nuestra Colección")).toBeInTheDocument();
    expect(screen.queryByText("El Manifiesto YIMA")).not.toBeInTheDocument();
  });

  it("muestra el bloque de manifiesto de marca", () => {
    renderPagina();

    expect(screen.getByText("El Manifiesto YIMA")).toBeInTheDocument();
  });

  it("no renderiza la barra de filtros ni el grid de productos", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalled();
    });

    expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar")).not.toBeInTheDocument();
    expect(screen.queryByText("Nuestra Colección")).not.toBeInTheDocument();
  });

  it("el bento pide los destacados filtrados en el backend", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({ destacado: true, pageSize: 4 });
    });
  });

  it("no muestra el bento de destacados si hay menos de 4 productos destacados", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO, destacado: true }]));
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalled();
    });
    expect(screen.queryByText("Hallazgos del día")).not.toBeInTheDocument();
  });

  it("muestra el bento cuando hay al menos 4 destacados", async () => {
    const destacados = [1, 2, 3, 4].map((id) => ({
      ...PRODUCTO,
      id,
      nombre: `Destacado ${id}`,
      destacado: true,
    }));
    productsApi.getProducts.mockResolvedValue(pagina(destacados));

    renderPagina();

    expect(await screen.findByText("Hallazgos del día")).toBeInTheDocument();
  });
});
