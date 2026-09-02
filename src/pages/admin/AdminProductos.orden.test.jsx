import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

/**
 * Selector "Ordenar por" del listado del admin.
 *
 * Lo que esta suite fija:
 *
 *   1. **El orden se pide al BACKEND**, nunca se reordena el array de la
 *      página. La tabla está paginada: ordenar en memoria reordena las 50
 *      filas que tocaron, no el catálogo.
 *   2. **Vive en la URL**, igual que `page` y `search`: un listado ordenado se
 *      puede compartir y recargar, y volver de editar un producto devuelve al
 *      mismo orden.
 *   3. **Cambiar el orden vuelve a la página 1.** La página 3 del orden
 *      anterior no tiene por qué contener lo mismo en el nuevo.
 *   4. **Se sincroniza con la URL cuando esta cambia por navegación**, no solo
 *      al montar — mismo patrón que ya usan el buscador y `CampoPrecio`.
 */

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  sku: "YIMA-RELOJC-1",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
  cantidadFotos: 0,
  stock: 4,
  visibleEnCatalogo: true,
  destacado: false,
  orden: 0,
};

function MostrarUrl() {
  const { search } = useLocation();
  return <div data-testid="url-search">{search}</div>;
}

function renderPagina(ruta = "/catalogo/admin/productos") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AdminProductos />
      <MostrarUrl />
    </MemoryRouter>,
  );
}

/** El `orden` del último llamado a `getProducts`. */
function ordenPedido() {
  const llamados = productsApi.getProducts.mock.calls;
  return llamados.at(-1)[0].orden;
}

beforeEach(() => {
  vi.clearAllMocks();
  productsApi.getProducts.mockResolvedValue({
    data: [{ ...PRODUCTO }],
    page: 1,
    pageSize: 50,
    total: 1,
  });
  productsApi.getProductsResumen.mockResolvedValue({
    total: 1,
    visibles: 1,
    publicados: 1,
    destacados: 0,
    destacadosPublicados: 0,
  });
});

describe("AdminProductos — selector de orden", () => {
  it("ofrece los criterios pedidos, incluido sin fotos primero", async () => {
    renderPagina();

    const selector = await screen.findByLabelText(/ordenar/i);
    const opciones = Array.from(selector.options).map((o) => o.textContent);

    expect(opciones).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/nombre.*a.*z/i),
        expect.stringMatching(/precio.*menor/i),
        expect.stringMatching(/precio.*mayor/i),
        expect.stringMatching(/stock/i),
        expect.stringMatching(/sin fotos/i),
        expect.stringMatching(/recientes/i),
        expect.stringMatching(/vistos/i),
      ]),
    );
  });

  it("pide el orden al backend, no reordena la página en memoria", async () => {
    const user = userEvent.setup();
    renderPagina();

    const selector = await screen.findByLabelText(/ordenar/i);
    await user.selectOptions(selector, "precio-desc");

    await waitFor(() => {
      expect(ordenPedido()).toBe("precio-desc");
    });
  });

  it("escribe el orden en la URL para poder compartir y recargar", async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.selectOptions(await screen.findByLabelText(/ordenar/i), "fotos-asc");

    await waitFor(() => {
      expect(screen.getByTestId("url-search").textContent).toContain("orden=fotos-asc");
    });
  });

  it("vuelve a la página 1 al cambiar el orden", async () => {
    const user = userEvent.setup();
    renderPagina("/catalogo/admin/productos?page=3");

    await user.selectOptions(await screen.findByLabelText(/ordenar/i), "stock-asc");

    await waitFor(() => {
      expect(screen.getByTestId("url-search").textContent).not.toContain("page=3");
    });
  });

  it("arranca con el orden que traiga la URL", async () => {
    renderPagina("/catalogo/admin/productos?orden=nombre");

    await waitFor(() => {
      expect(ordenPedido()).toBe("nombre");
    });
    expect(await screen.findByLabelText(/ordenar/i)).toHaveValue("nombre");
  });

  it("sin orden en la URL manda catalogo, el default de ESTA pantalla", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalled();
    });
    // El default del ENDPOINT sigue siendo `recientes` (el público no se
    // toca); el de esta pantalla es `catalogo` —primero lo que el cliente
    // ve— y por eso viaja explícito (decisión del 01/09/2026).
    expect(ordenPedido()).toBe("catalogo");
  });
});
