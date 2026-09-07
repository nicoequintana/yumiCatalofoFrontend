import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

/**
 * Selección múltiple con checkbox y acciones masivas del listado del admin,
 * más el tamaño de página de esta pantalla.
 *
 * Lo que estas suites protegen:
 *
 *   1. **La selección se limpia al paginar y al buscar.** Seleccionar en una
 *      página y ejecutar sobre otra es un accidente esperando a pasar: los
 *      ids seleccionados ya no están en pantalla, así que nadie puede ver
 *      sobre qué está actuando.
 *   2. **El borrado masivo informa lo que NO pudo borrar.** El backend
 *      rechaza los productos con ventas; si la pantalla dice "listo" igual,
 *      el admin cree que limpió el catálogo y no.
 *   3. **El checkbox del encabezado refleja la selección parcial**, en vez de
 *      mentir con un tilde lleno cuando hay una sola fila marcada.
 */

function pagina(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 50, total: filas.length, ...extra };
}

function producto(id, nombre, extra = {}) {
  return {
    id,
    nombre,
    sku: `YIMA-${id}`,
    etiqueta: null,
    categoria: null,
    precio: "1000",
    fotos: [],
    stock: 5,
    cantidadFotos: 0,
    visibleEnCatalogo: true,
    destacado: false,
    orden: 0,
    ...extra,
  };
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminProductos />
    </MemoryRouter>,
  );
}

function etiqueta(id, nombre, extra = {}) {
  return { id, nombre, cantidadProductos: 0, ...extra };
}

const TERMO = producto(1, "Termo");
const MATE = producto(2, "Mate");
const NUEVO = etiqueta(5, "Nuevo");
const OFERTA = etiqueta(6, "Oferta");

beforeEach(() => {
  vi.clearAllMocks();
  productsApi.getProducts.mockResolvedValue(pagina([TERMO, MATE]));
  productsApi.getEtiquetas.mockResolvedValue({ etiquetas: [NUEVO, OFERTA] });
});

describe("AdminProductos — tamaño de página", () => {
  it("pide 50 productos por página, no los 12 del catálogo público", async () => {
    renderPagina();

    await waitFor(() => expect(productsApi.getProducts).toHaveBeenCalled());
    expect(productsApi.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 50 }),
    );
  });
});

describe("AdminProductos — selección múltiple", () => {
  it("no muestra la barra de acciones si no hay nada seleccionado", async () => {
    renderPagina();

    await screen.findByText("Termo");
    expect(screen.queryByRole("button", { name: /ocultar seleccionados/i })).not.toBeInTheDocument();
  });

  it("muestra la barra con el conteo al seleccionar una fila", async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: "Seleccionar Termo" }));

    expect(await screen.findByText(/1 producto seleccionado/i)).toBeInTheDocument();
  });

  it("el checkbox del encabezado selecciona y deselecciona todo", async () => {
    const user = userEvent.setup();
    renderPagina();

    const todos = await screen.findByRole("checkbox", { name: /seleccionar todos/i });
    await user.click(todos);

    expect(await screen.findByText(/2 productos seleccionados/i)).toBeInTheDocument();

    await user.click(todos);
    expect(screen.queryByText(/seleccionado/i)).not.toBeInTheDocument();
  });

  it("el checkbox del encabezado queda indeterminado con selección parcial", async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: "Seleccionar Termo" }));

    const todos = screen.getByRole("checkbox", { name: /seleccionar todos/i });
    expect(todos.indeterminate).toBe(true);
    expect(todos.checked).toBe(false);
  });

  it("limpia la selección al cambiar de página", async () => {
    const user = userEvent.setup();
    productsApi.getProducts.mockResolvedValue(
      pagina([TERMO, MATE], { total: 120, pageSize: 50 }),
    );
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: "Seleccionar Termo" }));
    expect(await screen.findByText(/1 producto seleccionado/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /siguiente/i }));

    await waitFor(() => {
      expect(screen.queryByText(/producto seleccionado/i)).not.toBeInTheDocument();
    });
  });
});

describe("AdminProductos — ocultar en masa", () => {
  it("oculta los seleccionados y recarga el listado", async () => {
    const user = userEvent.setup();
    productsApi.updateVisibilidadMasiva.mockResolvedValue({ actualizados: 2 });
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: /seleccionar todos/i }));
    await user.click(screen.getByRole("button", { name: /ocultar seleccionados/i }));

    await waitFor(() => {
      expect(productsApi.updateVisibilidadMasiva).toHaveBeenCalledWith([1, 2], false);
    });
  });

  it("muestra los seleccionados con la acción inversa", async () => {
    const user = userEvent.setup();
    productsApi.updateVisibilidadMasiva.mockResolvedValue({ actualizados: 1 });
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: "Seleccionar Mate" }));
    await user.click(screen.getByRole("button", { name: /mostrar seleccionados/i }));

    await waitFor(() => {
      expect(productsApi.updateVisibilidadMasiva).toHaveBeenCalledWith([2], true);
    });
  });
});

describe("AdminProductos — etiqueta en masa", () => {
  it("asigna la etiqueta elegida a los seleccionados", async () => {
    const user = userEvent.setup();
    productsApi.updateEtiquetaMasiva.mockResolvedValue({ actualizados: 2 });
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: /seleccionar todos/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /etiqueta a aplicar/i }),
      "5",
    );
    await user.click(screen.getByRole("button", { name: /aplicar etiqueta/i }));

    await waitFor(() => {
      expect(productsApi.updateEtiquetaMasiva).toHaveBeenCalledWith([1, 2], 5);
    });
  });

  it("la opción de quitar etiqueta manda etiquetaId null", async () => {
    const user = userEvent.setup();
    productsApi.updateEtiquetaMasiva.mockResolvedValue({ actualizados: 1 });
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: "Seleccionar Mate" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /etiqueta a aplicar/i }),
      "quitar",
    );
    await user.click(screen.getByRole("button", { name: /aplicar etiqueta/i }));

    await waitFor(() => {
      expect(productsApi.updateEtiquetaMasiva).toHaveBeenCalledWith([2], null);
    });
  });

  it("recarga el listado y limpia la selección tras aplicar", async () => {
    const user = userEvent.setup();
    productsApi.updateEtiquetaMasiva.mockResolvedValue({ actualizados: 2 });
    renderPagina();

    await screen.findByText("Termo");
    const llamadasAntes = productsApi.getProducts.mock.calls.length;

    await user.click(screen.getByRole("checkbox", { name: /seleccionar todos/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /etiqueta a aplicar/i }),
      "5",
    );
    await user.click(screen.getByRole("button", { name: /aplicar etiqueta/i }));

    await waitFor(() => {
      expect(productsApi.getProducts.mock.calls.length).toBeGreaterThan(llamadasAntes);
    });
    expect(screen.queryByText(/seleccionado/i)).not.toBeInTheDocument();
  });

  it("muestra el mensaje de error propio del backend", async () => {
    const user = userEvent.setup();
    productsApi.updateEtiquetaMasiva.mockRejectedValue(
      new Error("La etiqueta elegida ya no existe. Recargá la página."),
    );
    renderPagina();

    await user.click(await screen.findByRole("checkbox", { name: /seleccionar todos/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /etiqueta a aplicar/i }),
      "5",
    );
    await user.click(screen.getByRole("button", { name: /aplicar etiqueta/i }));

    expect(
      await screen.findByText("La etiqueta elegida ya no existe. Recargá la página."),
    ).toBeInTheDocument();
  });
});

describe("AdminProductos — eliminar en masa", () => {
  async function seleccionarYPedirBorrado(user) {
    await user.click(await screen.findByRole("checkbox", { name: /seleccionar todos/i }));
    await user.click(screen.getByRole("button", { name: /eliminar seleccionados/i }));
  }

  it("pide confirmación antes de borrar", async () => {
    const user = userEvent.setup();
    renderPagina();

    await seleccionarYPedirBorrado(user);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(productsApi.deleteProductsMasivo).not.toHaveBeenCalled();
  });

  it("borra al confirmar", async () => {
    const user = userEvent.setup();
    productsApi.deleteProductsMasivo.mockResolvedValue({ eliminados: [1, 2], rechazados: [] });
    renderPagina();

    await seleccionarYPedirBorrado(user);
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: /^eliminar$/i }));

    await waitFor(() => {
      expect(productsApi.deleteProductsMasivo).toHaveBeenCalledWith([1, 2]);
    });
  });

  it("informa cuales NO se pudieron borrar y por que", async () => {
    const user = userEvent.setup();
    productsApi.deleteProductsMasivo.mockResolvedValue({
      eliminados: [1],
      rechazados: [
        { id: 2, nombre: "Mate", motivo: "El producto aparece en 3 órdenes de compra." },
      ],
    });
    renderPagina();

    await seleccionarYPedirBorrado(user);
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: /^eliminar$/i }));

    // Se busca DENTRO del informe: "Mate" también sigue en su fila de la
    // tabla, justamente porque no se pudo borrar.
    const informe = await screen.findByRole("status");
    expect(within(informe).getByText(/se eliminó 1 producto/i)).toBeInTheDocument();
    expect(within(informe).getByText("Mate")).toBeInTheDocument();
    expect(
      within(informe).getByText(/El producto aparece en 3 órdenes de compra\./),
    ).toBeInTheDocument();
  });

  it("no dice que borro nada cuando el backend rechazo todo", async () => {
    const user = userEvent.setup();
    productsApi.deleteProductsMasivo.mockResolvedValue({
      eliminados: [],
      rechazados: [
        { id: 1, nombre: "Termo", motivo: "El producto aparece en 1 orden de compra." },
        { id: 2, nombre: "Mate", motivo: "El producto aparece en 2 órdenes de compra." },
      ],
    });
    renderPagina();

    await seleccionarYPedirBorrado(user);
    const dialogo = await screen.findByRole("dialog");
    await user.click(within(dialogo).getByRole("button", { name: /^eliminar$/i }));

    expect(await screen.findByText(/no se eliminó ningún producto/i)).toBeInTheDocument();
  });
});
