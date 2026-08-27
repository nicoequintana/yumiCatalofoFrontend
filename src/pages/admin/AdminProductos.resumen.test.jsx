import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

/**
 * Contadores de catálogo del encabezado de `/catalogo/admin`.
 *
 * Lo que esta suite fija:
 *
 *   1. **Los tres números son globales**, no de la página ni de la búsqueda.
 *      Se leen de `getProductsResumen`, nunca de `productos.length`.
 *   2. **"En el catálogo" declara los agotados.** Un producto visible sin
 *      stock no aparece en `/coleccion`, así que el número solo del toggle
 *      mentiría sobre lo que ve un cliente.
 *   3. **Un resumen que falla muestra `—`, nunca `0`.** Un cero se lee como
 *      "no tenés productos", que es un dato inventado.
 *   4. **Se recarga después de mutar**, o el número queda contradiciendo a la
 *      tabla que está justo debajo.
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

const RESUMEN = {
  total: 63,
  visibles: 58,
  publicados: 55,
  destacados: 6,
  destacadosPublicados: 5,
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminProductos />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  productsApi.getProducts.mockResolvedValue({
    data: [{ ...PRODUCTO }],
    page: 1,
    pageSize: 50,
    total: 1,
  });
  productsApi.getProductsResumen.mockResolvedValue({ ...RESUMEN });
});

describe("AdminProductos — contadores de catálogo", () => {
  it("muestra totales, visibles y destacados del catálogo entero", async () => {
    renderPagina();

    const totales = await screen.findByTestId("resumen-total");
    expect(within(totales).getByText("63")).toBeInTheDocument();
    // El número es del catálogo, no de la única fila que trajo esta página.
    expect(within(totales).queryByText("1")).not.toBeInTheDocument();

    expect(within(screen.getByTestId("resumen-visibles")).getByText("58")).toBeInTheDocument();
    expect(within(screen.getByTestId("resumen-destacados")).getByText("6")).toBeInTheDocument();
  });

  it("declara cuántos visibles están agotados y no se ven en la tienda", async () => {
    renderPagina();

    const visibles = await screen.findByTestId("resumen-visibles");
    // 58 visibles − 55 publicados = 3 que el toggle muestra pero la tienda no.
    expect(within(visibles).getByText(/3 sin stock/i)).toBeInTheDocument();
  });

  it("avisa cuando los destacados publicados no alcanzan para el carrusel", async () => {
    productsApi.getProductsResumen.mockResolvedValue({
      ...RESUMEN,
      destacados: 3,
      destacadosPublicados: 3,
    });

    renderPagina();

    const destacados = await screen.findByTestId("resumen-destacados");
    expect(within(destacados).getByText(/hacen falta 4/i)).toBeInTheDocument();
  });

  it("muestra — en vez de 0 cuando el resumen falla", async () => {
    productsApi.getProductsResumen.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    const totales = await screen.findByTestId("resumen-total");
    expect(within(totales).getByText("—")).toBeInTheDocument();
    expect(within(totales).queryByText("0")).not.toBeInTheDocument();
    // El fallo del resumen no puede tumbar la tabla.
    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
  });

  it("recarga los contadores después de cambiar la visibilidad de un producto", async () => {
    const user = userEvent.setup();
    productsApi.updateVisibilidad.mockResolvedValue({ ...PRODUCTO, visibleEnCatalogo: false });

    renderPagina();

    await screen.findByTestId("resumen-total");
    expect(productsApi.getProductsResumen).toHaveBeenCalledTimes(1);

    await user.click(
      await screen.findByRole("switch", { name: "Mostrar Reloj Clásico en el catálogo" }),
    );

    await waitFor(() => {
      expect(productsApi.getProductsResumen).toHaveBeenCalledTimes(2);
    });
  });
});
