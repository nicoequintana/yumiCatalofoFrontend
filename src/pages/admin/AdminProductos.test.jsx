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

  it("no llama a la API y vuelve al valor persistido si el orden queda vacío al perder el foco", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
    await waitFor(() => expect(inputOrden).toHaveValue(0));
  });

  it("no llama a la API si el orden tipeado es no numérico (abc)", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.type(inputOrden, "abc");
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
  });

  it("no llama a la API si el orden tipeado tiene decimales (1.5)", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.type(inputOrden, "1.5");
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
  });

  it("no pisa un draft en progreso cuando el guardado anterior resuelve mientras el admin ya está tipeando el próximo valor (race)", async () => {
    const user = userEvent.setup();

    // First PATCH (orden=5) is controlled manually so it can be resolved at
    // a precise moment: AFTER the admin has already started typing the next
    // draft, but BEFORE that next draft is blurred/submitted. This is the
    // exact interleaving the bug required — resolving after the whole
    // second save completed never exercised the guard (verified: reverting
    // the fix to an unconditional clear kept that ordering green).
    let resolverLento;
    const patchLento = new Promise((resolve) => {
      resolverLento = resolve;
    });
    productsApi.updateMerchandising.mockReturnValueOnce(patchLento);

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });

    // First edit: 0 -> 5, blur fires the slow PATCH (still pending).
    await user.clear(inputOrden);
    await user.type(inputOrden, "5");
    await user.tab();
    await waitFor(() => expect(productsApi.updateMerchandising).toHaveBeenCalledWith(1, { orden: 5 }));

    // Admin refocuses and starts typing a newer, NOT-YET-SUBMITTED draft
    // (still mid-edit, no blur yet).
    await user.click(inputOrden);
    await user.clear(inputOrden);
    await user.type(inputOrden, "9");
    expect(inputOrden).toHaveValue(9);

    // The slow first PATCH resolves now, while "9" is still just a local,
    // unsaved draft. Its `finally` must NOT wipe that draft back to the
    // persisted `orden` — the buggy unconditional-clear version reverts the
    // input to 5 here; the fixed version leaves "9" alone since it no
    // longer matches the value ("5") that triggered this particular save.
    resolverLento({ ...PRODUCTO, orden: 5 });
    await waitFor(() => expect(productsApi.updateMerchandising).toHaveBeenCalledTimes(1));

    expect(inputOrden).toHaveValue(9);
  });
});
