import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  sku: "YIMA-RELOJC-1",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
  visibleEnCatalogo: true,
  destacado: false,
  orden: 0,
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminProductos />
    </MemoryRouter>,
  );
}

describe("AdminProductos - destacado y orden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO }]);
  });

  it("muestra el switch de destacado y lo togglea via updateMerchandising", async () => {
    const user = userEvent.setup();
    productsApi.updateMerchandising.mockResolvedValue({ ...PRODUCTO, destacado: true });

    renderPagina();

    const switchDestacado = await screen.findByRole("switch", { name: "Destacar Reloj Clásico" });
    expect(switchDestacado).toHaveAttribute("aria-checked", "false");

    await user.click(switchDestacado);

    await waitFor(() => {
      expect(productsApi.updateMerchandising).toHaveBeenCalledWith(1, { destacado: true });
    });
  });

  it("guarda el nuevo orden al perder el foco del input", async () => {
    const user = userEvent.setup();
    productsApi.updateMerchandising.mockResolvedValue({ ...PRODUCTO, orden: 5 });

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.type(inputOrden, "5");
    await user.tab();

    await waitFor(() => {
      expect(productsApi.updateMerchandising).toHaveBeenCalledWith(1, { orden: 5 });
    });
  });

  it("no llama a la API si el orden no cambió al perder el foco", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.click(inputOrden);
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
  });
});
