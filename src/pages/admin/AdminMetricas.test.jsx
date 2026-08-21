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

  it("pide el ranking ordenado al backend y respeta ese orden", async () => {
    // El orden lo decide el backend (`orden=vistas`), no un sort local: con el
    // listado paginado, reordenar del lado del cliente solo daría vuelta la
    // página que tocó y el ranking sería falso. Por eso el mock devuelve las
    // filas YA ordenadas y el test verifica que la pantalla no las toque.
    productsApi.getProducts.mockResolvedValue({
      data: [
        { id: 2, nombre: "Más visto", vistas: 40, compartidos: 0, favoritosCount: 0 },
        { id: 1, nombre: "Menos visto", vistas: 3, compartidos: 0, favoritosCount: 0 },
      ],
      page: 1,
      pageSize: 12,
      total: 2,
    });

    renderPagina();

    const filas = await screen.findAllByRole("row");
    // La primera fila es el encabezado de la tabla.
    expect(filas[1]).toHaveTextContent("Más visto");
    expect(productsApi.getProducts).toHaveBeenCalledWith({
      admin: true,
      orden: "vistas",
      page: 1,
    });
  });

  it("muestra un error en vez de quedarse cargando para siempre", async () => {
    productsApi.getProducts.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    expect(await screen.findByText(/No se pudieron cargar las métricas/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando métricas…")).not.toBeInTheDocument();
  });
});
