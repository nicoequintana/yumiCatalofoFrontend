import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminCombos from "./AdminCombos.jsx";
import * as combosApi from "../../api/combos.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/combos.js");

function fila(extra = {}) {
  return {
    id: 1, ruta: "/combos/1-kit-living-calido", nombre: "Kit Living Cálido", porcentaje: 15,
    activo: true, vigencia: "SIEMPRE", vigente: true, unidades: 3,
    precioSeparado: "45000", precioCombo: "38250", alcanza: 4, campania: null,
    items: [
      { productId: 1, nombre: "Lámpara", cantidad: 2, foto: "https://cdn.example.com/lampara.jpg" },
      { productId: 2, nombre: "Mesa", cantidad: 1, foto: null },
    ],
    ...extra,
  };
}

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminCombos />
    </MemoryRouter>,
  );
}

async function filaDe(nombre) {
  return (await screen.findByText(nombre)).closest("tr");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminCombos", () => {
  it("lista cada combo con productos, precio, vigencia, estado y stock", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila()]);
    renderPagina();

    const tr = await filaDe("Kit Living Cálido");
    expect(within(tr).getByText("3 productos")).toBeInTheDocument();
    expect(within(tr).getByText("2× Lámpara · Mesa")).toBeInTheDocument();
    expect(within(tr).getByText("$ 45.000")).toBeInTheDocument();
    expect(within(tr).getByText("$ 38.250")).toBeInTheDocument();
    expect(within(tr).getByText("-15%")).toBeInTheDocument();
    expect(within(tr).getByText("Siempre vigente")).toBeInTheDocument();
    expect(within(tr).getByText("Activo")).toBeInTheDocument();
    expect(within(tr).getByText("4 combos")).toBeInTheDocument();
    expect(within(tr).getByRole("link", { name: "Editar Kit Living Cálido" })).toHaveAttribute("href", "/catalogo/admin/combos/1");
    expect(within(tr).getByRole("link", { name: "Ver Kit Living Cálido en la tienda" })).toHaveAttribute("href", "/combos/1-kit-living-calido");
  });

  // Spec §8.2: la columna "Productos" son mini fichas CON FOTO, no solo texto
  // (ruling del preflight, F16) — `mapComboListado` (Task 26 backend) resuelve
  // `items[].foto` igual que `mapComboPublico`; acá solo se pinta.
  it("la columna Productos muestra la mini ficha con foto de cada producto, o un ícono si no tiene", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila()]);
    renderPagina();

    const tr = await filaDe("Kit Living Cálido");
    const fichaLampara = within(tr).getByTestId("mini-foto-1");
    expect(fichaLampara.querySelector("img")).toHaveAttribute("src", "https://cdn.example.com/lampara.jpg");

    const fichaMesa = within(tr).getByTestId("mini-foto-2");
    expect(fichaMesa.querySelector("img")).toBeNull();
    expect(within(fichaMesa).getByText("inventory_2")).toBeInTheDocument();
  });

  it("un combo apagado dice Apagado y no ofrece verlo en la tienda (daría 404)", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila({ activo: false, vigente: false })]);
    renderPagina();

    const tr = await filaDe("Kit Living Cálido");
    expect(within(tr).getByText("Apagado")).toBeInTheDocument();
    expect(within(tr).queryByRole("link", { name: /en la tienda/ })).not.toBeInTheDocument();
  });

  it("CAMPANIA vigente según el backend dice En fecha y nombra la campaña", async () => {
    combosApi.getAdminCombos.mockResolvedValue([
      fila({ vigencia: "CAMPANIA", vigente: true, campania: { id: 4, nombre: "Navidad", estado: "HABILITADA" } }),
    ]);
    renderPagina();

    const tr = await filaDe("Kit Living Cálido");
    expect(within(tr).getByText("En fecha")).toBeInTheDocument();
    expect(within(tr).getByText("Programado desde campañas · Navidad")).toBeInTheDocument();
  });

  it("CAMPANIA activo pero NO vigente según el backend dice Fuera de fecha, aunque tenga campaña", async () => {
    combosApi.getAdminCombos.mockResolvedValue([
      fila({ vigencia: "CAMPANIA", vigente: false, campania: { id: 4, nombre: "Navidad", estado: "BORRADOR" } }),
    ]);
    renderPagina();

    expect(within(await filaDe("Kit Living Cálido")).getByText("Fuera de fecha")).toBeInTheDocument();
  });

  it("CAMPANIA sin campaña asociada dice Sin campaña", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila({ vigencia: "CAMPANIA", vigente: false, campania: null })]);
    renderPagina();

    expect(within(await filaDe("Kit Living Cálido")).getByText("Sin campaña")).toBeInTheDocument();
  });

  it("sin stock, la columna Stock dice Agotado", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila({ alcanza: 0 })]);
    renderPagina();

    expect(within(await filaDe("Kit Living Cálido")).getByText("Agotado")).toBeInTheDocument();
  });

  it("eliminar pide confirmación en línea, borra y recarga", async () => {
    combosApi.getAdminCombos.mockResolvedValueOnce([fila()]).mockResolvedValueOnce([]);
    combosApi.eliminarCombo.mockResolvedValue({ ok: true });
    renderPagina();

    const tr = await filaDe("Kit Living Cálido");
    await userEvent.click(within(tr).getByRole("button", { name: "Eliminar" }));
    expect(combosApi.eliminarCombo).not.toHaveBeenCalled();
    await userEvent.click(within(tr).getByRole("button", { name: "Sí, eliminar" }));

    expect(combosApi.eliminarCombo).toHaveBeenCalledWith(1);
    expect(await screen.findByText("Todavía no hay combos")).toBeInTheDocument();
  });

  it("un borrado rechazado (p. ej. sin permiso) muestra el mensaje del servidor", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila()]);
    combosApi.eliminarCombo.mockRejectedValue(new Error("No tenés permiso para eliminar."));
    renderPagina();

    const tr = await filaDe("Kit Living Cálido");
    await userEvent.click(within(tr).getByRole("button", { name: "Eliminar" }));
    await userEvent.click(within(tr).getByRole("button", { name: "Sí, eliminar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No tenés permiso para eliminar.");
  });

  it("si la carga falla muestra el error, distinto de 'no hay combos'", async () => {
    combosApi.getAdminCombos.mockRejectedValue(new Error("Failed to fetch"));
    renderPagina();

    expect(await screen.findByText("No se pudieron cargar los combos")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay combos")).not.toBeInTheDocument();
  });

  it("tiene el botón Nuevo combo", async () => {
    combosApi.getAdminCombos.mockResolvedValue([]);
    renderPagina();

    expect(await screen.findByRole("link", { name: "Nuevo combo" })).toHaveAttribute("href", "/catalogo/admin/combos/nuevo");
  });

  it("cumple el contrato de la tabla apilada", async () => {
    combosApi.getAdminCombos.mockResolvedValue([fila()]);
    renderPagina();

    await screen.findByText("Kit Living Cálido");
    esperarTablaApilada(screen.getByRole("table"));
  });
});
