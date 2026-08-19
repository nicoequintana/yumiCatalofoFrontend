import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Catalogo from "./Catalogo.jsx";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

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

describe("Catalogo - home editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO }]);
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

  it("el bento pide los destacados con un fetch sin filtros", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({});
    });
  });

  it("no muestra el bento de destacados si hay menos de 4 productos destacados", async () => {
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO, destacado: true }]);
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
    productsApi.getProducts.mockResolvedValue(destacados);

    renderPagina();

    expect(await screen.findByText("Hallazgos del día")).toBeInTheDocument();
  });
});
