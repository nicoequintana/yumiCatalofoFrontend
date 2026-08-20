import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminMetricas from "./AdminMetricas.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminMetricas />
    </MemoryRouter>,
  );
}

describe("AdminMetricas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ordena los productos por vistas, de mayor a menor", async () => {
    productsApi.getProducts.mockResolvedValue([
      { id: 1, nombre: "Menos visto", vistas: 3, compartidos: 0, favoritosCount: 0 },
      { id: 2, nombre: "Más visto", vistas: 40, compartidos: 0, favoritosCount: 0 },
    ]);

    renderPagina();

    const filas = await screen.findAllByRole("row");
    // La primera fila es el encabezado de la tabla.
    expect(filas[1]).toHaveTextContent("Más visto");
  });

  it("muestra un error en vez de quedarse cargando para siempre", async () => {
    productsApi.getProducts.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    expect(await screen.findByText(/No se pudieron cargar las métricas/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando métricas…")).not.toBeInTheDocument();
  });
});
