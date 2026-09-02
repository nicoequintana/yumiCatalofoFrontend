import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminOrdenes from "./AdminOrdenes.jsx";
import * as ordenesApi from "../../api/ordenes.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/ordenes.js");

const ORDEN = {
  id: 1,
  cliente: { nombre: "Ana López", dni: "12345678" },
  estado: "PENDIENTE",
  createdAt: "2026-08-01T00:00:00.000Z",
  _count: { items: 3 },
};

function renderPagina(ruta = "/catalogo/admin/ordenes") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AdminOrdenes />
    </MemoryRouter>,
  );
}

describe("AdminOrdenes", () => {
  beforeEach(() => {
  ordenesApi.getEstadosOrden.mockResolvedValue([
    { valor: "PENDIENTE", etiqueta: "Pendiente", terminal: false },
    { valor: "EN_PREPARACION", etiqueta: "En preparación", terminal: false },
    { valor: "ENTREGADA", etiqueta: "Entregada", terminal: true },
    { valor: "CANCELADA", etiqueta: "Cancelada", terminal: true },
  ]);
    vi.clearAllMocks();
    ordenesApi.getOrdenes.mockResolvedValue({ data: [ORDEN], page: 1, pageSize: 20, total: 1 });
  });

  it("muestra loading y luego la tabla con las órdenes", async () => {
    renderPagina();

    expect(screen.getByText("Cargando órdenes…")).toBeInTheDocument();

    expect(await screen.findByText("#1")).toBeInTheDocument();
    expect(screen.getByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("muestra estado vacío cuando data está vacío", async () => {
    ordenesApi.getOrdenes.mockResolvedValue({ data: [], page: 1, pageSize: 20, total: 0 });

    renderPagina();

    expect(await screen.findByText("No hay órdenes")).toBeInTheDocument();
  });

  it("el filtro de estado dispara un refetch con el query param correcto y resetea a página 1", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("#1");
    vi.clearAllMocks();
    ordenesApi.getOrdenes.mockResolvedValue({ data: [ORDEN], page: 1, pageSize: 20, total: 1 });

    const select = screen.getByLabelText("Filtrar por estado");
    await user.selectOptions(select, "EN_PREPARACION");

    await waitFor(() => {
      expect(ordenesApi.getOrdenes).toHaveBeenCalledWith(
        expect.objectContaining({ estado: "EN_PREPARACION", page: 1 }),
      );
    });
  });

  it("los botones de paginación llaman a getOrdenes con la página actualizada", async () => {
    const user = userEvent.setup();
    ordenesApi.getOrdenes.mockResolvedValue({ data: [ORDEN], page: 1, pageSize: 1, total: 2 });

    renderPagina();

    await screen.findByText("#1");

    const btnAnterior = screen.getByRole("button", { name: "Anterior" });
    const btnSiguiente = screen.getByRole("button", { name: "Siguiente" });
    expect(btnAnterior).toBeDisabled();
    expect(btnSiguiente).not.toBeDisabled();

    vi.clearAllMocks();
    ordenesApi.getOrdenes.mockResolvedValue({ data: [ORDEN], page: 2, pageSize: 1, total: 2 });

    await user.click(btnSiguiente);

    await waitFor(() => {
      expect(ordenesApi.getOrdenes).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it("inicializa el filtro de dni desde el query param de la URL", async () => {
    renderPagina("/catalogo/admin/ordenes?dni=12345678");

    await waitFor(() => {
      expect(ordenesApi.getOrdenes).toHaveBeenCalledWith(expect.objectContaining({ dni: "12345678" }));
    });
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    await screen.findByText("#1");
    esperarTablaApilada(screen.getByRole("table"));
  });
});
