import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";
import * as configApi from "../../api/config.js";

vi.mock("../../api/products.js");
vi.mock("../../api/config.js");

/**
 * Acción "Ícono de la home" por fila (T7).
 *
 * Mismo lugar que "Destacado": una acción POR FILA en `AdminProductos.jsx`,
 * no en el editor de ficha (`AdminProductoForm.jsx` trata ese campo como solo
 * lectura, ver el brief). Es un botón, no un switch: es un singleton (T5)
 * donde elegir uno reemplaza al anterior, así que no hay estado
 * independiente por fila que un switch pudiera sugerir.
 *
 * Lo que esta suite fija:
 *
 *   1. La fila que coincide con `productoIconoId` (traído de
 *      `getConfiguracionHome` al cargar) muestra el rótulo de "ya es el
 *      ícono", sin botón de acción.
 *   2. Las demás filas ofrecen el botón "Usar como ícono de la home".
 *   3. Click en el botón llama `actualizarConfiguracionHome(id)` — el PUT es
 *      el que decide el reemplazo, esta pantalla no lo calcula.
 */

function producto(cambios = {}) {
  return {
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
    ...cambios,
  };
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminProductos />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  productsApi.getProductsResumen.mockResolvedValue({
    total: 2,
    visibles: 2,
    publicados: 2,
    destacados: 0,
    destacadosPublicados: 0,
  });
  configApi.getConfiguracionHome.mockResolvedValue({ productoIcono: null });
});

describe("AdminProductos — producto ícono de la home", () => {
  it("marca el producto ícono actual y permite elegir otro", async () => {
    productsApi.getProducts.mockResolvedValue({
      data: [producto({ id: 1 }), producto({ id: 2, nombre: "Vela Aromática", sku: "YIMA-VELA-2" })],
      page: 1,
      pageSize: 20,
      total: 2,
    });
    configApi.getConfiguracionHome.mockResolvedValue({ productoIcono: { id: 1 } });
    configApi.actualizarConfiguracionHome.mockResolvedValue({ productoIcono: { id: 2 } });

    renderPagina();

    expect(await screen.findByText("Es el ícono de la home")).toBeInTheDocument();
    const botonElegir = screen.getByRole("button", { name: /usar como ícono de la home/i });

    const user = userEvent.setup();
    await user.click(botonElegir);

    expect(configApi.actualizarConfiguracionHome).toHaveBeenCalledWith(2);
  });

  it("no ofrece un botón de acción en la fila que ya es el ícono", async () => {
    productsApi.getProducts.mockResolvedValue({
      data: [producto({ id: 1 })],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    configApi.getConfiguracionHome.mockResolvedValue({ productoIcono: { id: 1 } });

    renderPagina();

    expect(await screen.findByText("Es el ícono de la home")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /usar como ícono de la home/i })).not.toBeInTheDocument();
  });

  it("actualiza qué fila queda marcada tras elegir otro ícono", async () => {
    productsApi.getProducts.mockResolvedValue({
      data: [producto({ id: 1 }), producto({ id: 2, nombre: "Vela Aromática", sku: "YIMA-VELA-2" })],
      page: 1,
      pageSize: 20,
      total: 2,
    });
    configApi.getConfiguracionHome.mockResolvedValue({ productoIcono: { id: 1 } });
    configApi.actualizarConfiguracionHome.mockResolvedValue({ productoIcono: { id: 2 } });

    renderPagina();

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /usar como ícono de la home/i }));

    await waitFor(() => {
      expect(screen.getAllByText("Es el ícono de la home")).toHaveLength(1);
    });
    expect(screen.getByRole("button", { name: /usar como ícono de la home/i })).toBeInTheDocument();
  });
});
