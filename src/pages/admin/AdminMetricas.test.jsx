import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("ofrece reintentar tras un fallo, y el reintento exitoso limpia el error", async () => {
    // Sin `setError(null)` en el éxito la pantalla quedaba clavada en el
    // error para siempre; y como el paginador se renderiza con `!error`,
    // desaparecía — no había forma de reintentar sin recargar la página.
    const user = userEvent.setup();
    productsApi.getProducts.mockRejectedValueOnce(new Error("Failed to fetch"));
    productsApi.getProducts.mockResolvedValue({
      data: [{ id: 1, nombre: "Reloj Clásico", sku: "YIMA-1", vistas: 7, compartidos: 2 }],
      page: 1,
      pageSize: 12,
      total: 1,
    });

    renderPagina();

    await screen.findByText(/No se pudieron cargar las métricas/i);

    await user.click(screen.getByRole("button", { name: /reintentar/i }));

    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.queryByText(/No se pudieron cargar las métricas/i)).not.toBeInTheDocument();
  });

  it("corrige una página fuera de rango a la última real", async () => {
    // Mismo patrón que AdminProductos: un link viejo o un catálogo que se
    // achicó pueden apuntar a una página que ya no existe. Mostrar la tabla
    // vacía mentiría — los productos están, la página no.
    productsApi.getProducts.mockResolvedValue({
      data: [{ id: 1, nombre: "Reloj Clásico", sku: "YIMA-1", vistas: 7, compartidos: 2 }],
      page: 1,
      pageSize: 12,
      total: 1,
    });

    render(
      <MemoryRouter initialEntries={["/catalogo/admin/metricas?page=5"]}>
        <AdminMetricas />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        orden: "vistas",
        page: 5,
      });
    });

    // La corrección vuelve a pedir la última página real.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        orden: "vistas",
        page: 1,
      });
    });
    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
  });
});
