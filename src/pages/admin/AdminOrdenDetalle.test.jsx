import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminOrdenDetalle from "./AdminOrdenDetalle.jsx";
import * as ordenesApi from "../../api/ordenes.js";

vi.mock("../../api/ordenes.js");

const ORDEN = {
  id: 42,
  estado: "ENTREGADA",
  notas: "Entregar por la tarde",
  createdAt: "2026-08-01T00:00:00.000Z",
  cliente: { nombre: "Ana López", dni: "12345678", telefono: "1122334455", email: "ana@example.com" },
  items: [
    { id: 1, nombreProducto: "Producto A", precioUnitario: "0.10", cantidad: 1 },
    { id: 2, nombreProducto: "Producto B", precioUnitario: "0.20", cantidad: 1 },
  ],
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/ordenes/42"]}>
      <Routes>
        <Route path="/catalogo/admin/ordenes/:id" element={<AdminOrdenDetalle />} />
        <Route path="/catalogo/admin/ordenes" element={<div>Listado de órdenes</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminOrdenDetalle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenesApi.getOrdenById.mockResolvedValue(ORDEN);
  });

  it("muestra info de cliente, items y total calculado en centavos (evita drift de floats)", async () => {
    renderPagina();

    expect(await screen.findByText("Ana López")).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
    expect(screen.getByText("1122334455")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Producto A")).toBeInTheDocument();
    expect(screen.getByText("Producto B")).toBeInTheDocument();
    expect(screen.getByText("Entregar por la tarde")).toBeInTheDocument();

    // 0.10 + 0.20 en floats da 0.30000000000000004 — la suma en centavos
    // debe devolver exactamente $ 0,30.
    expect(screen.getByText("$ 0,30")).toBeInTheDocument();
  });

  it("el dni es un link a /catalogo/admin/ordenes?dni=<dni>", async () => {
    renderPagina();

    const linkDni = await screen.findByRole("link", { name: "12345678" });
    expect(linkDni).toHaveAttribute("href", "/catalogo/admin/ordenes?dni=12345678");
  });

  it("una orden en ENTREGADA sigue teniendo todos los 5 estados habilitados en el select (sin restricción de transición)", async () => {
    renderPagina();

    const select = await screen.findByLabelText("Cambiar estado de la orden");
    expect(select).toHaveValue("ENTREGADA");

    const opciones = screen.getAllByRole("option");
    const valores = opciones.map((o) => o.value);
    expect(valores).toEqual(["PENDIENTE", "CONFIRMADA", "EN_PREPARACION", "ENTREGADA", "CANCELADA"]);

    for (const opcion of opciones) {
      expect(opcion).not.toBeDisabled();
    }
    expect(select).not.toBeDisabled();
  });

  it("cambiar el select llama a actualizarEstadoOrden con id y nuevo estado", async () => {
    const user = userEvent.setup();
    ordenesApi.actualizarEstadoOrden.mockResolvedValue({ ...ORDEN, estado: "PENDIENTE" });

    renderPagina();

    const select = await screen.findByLabelText("Cambiar estado de la orden");
    await user.selectOptions(select, "PENDIENTE");

    await waitFor(() => {
      expect(ordenesApi.actualizarEstadoOrden).toHaveBeenCalledWith("42", "PENDIENTE");
    });
  });

  it("ante un error al cambiar estado, muestra mensaje y revierte al estado persistido", async () => {
    const user = userEvent.setup();
    ordenesApi.actualizarEstadoOrden.mockRejectedValue(new Error("No se pudo actualizar."));

    renderPagina();

    const select = await screen.findByLabelText("Cambiar estado de la orden");
    await user.selectOptions(select, "PENDIENTE");

    expect(await screen.findByText("No se pudo actualizar.")).toBeInTheDocument();
    await waitFor(() => {
      expect(select).toHaveValue("ENTREGADA");
    });
  });
});
