import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminOrdenDetalle from "./AdminOrdenDetalle.jsx";

vi.mock("../../api/ordenes.js", () => ({
  getOrdenById: vi.fn(),
  actualizarEstadoOrden: vi.fn(),
}));

const { getOrdenById, actualizarEstadoOrden } = await import("../../api/ordenes.js");

const ORDEN = {
  id: 42,
  estado: "PENDIENTE",
  notas: null,
  createdAt: "2026-08-23T12:00:00.000Z",
  cliente: { dni: "12345678", nombre: "Juan Perez", telefono: "1122334455", email: "juan@gmail.com" },
  items: [{ id: 1, productId: 1, nombreProducto: "Difusor", precioUnitario: "8000.00", cantidad: 1 }],
};

// Fixture de las tres pruebas preexistentes (info de cliente, link de DNI,
// los 5 estados habilitados). Se mantiene aparte de ORDEN porque ejercita un
// caso que ORDEN no cubre: la suma en centavos de dos precios que en floats
// arrastran error (0.10 + 0.20).
const ORDEN_ENTREGADA = {
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

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/ordenes/42"]}>
      <Routes>
        <Route path="/catalogo/admin/ordenes/:id" element={<AdminOrdenDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getOrdenById.mockReset();
  getOrdenById.mockResolvedValue(ORDEN);
  actualizarEstadoOrden.mockReset();
  actualizarEstadoOrden.mockResolvedValue({ ...ORDEN, estado: "CONFIRMADA" });
});

describe("AdminOrdenDetalle — datos de la orden", () => {
  it("muestra info de cliente, items y total calculado en centavos (evita drift de floats)", async () => {
    getOrdenById.mockResolvedValue(ORDEN_ENTREGADA);
    renderDetalle();

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
    getOrdenById.mockResolvedValue(ORDEN_ENTREGADA);
    renderDetalle();

    const linkDni = await screen.findByRole("link", { name: "12345678" });
    expect(linkDni).toHaveAttribute("href", "/catalogo/admin/ordenes?dni=12345678");
  });

  it("una orden en ENTREGADA sigue teniendo todos los 5 estados habilitados en el select (sin restricción de transición)", async () => {
    getOrdenById.mockResolvedValue(ORDEN_ENTREGADA);
    renderDetalle();

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
});

describe("AdminOrdenDetalle — cambio de estado", () => {
  it("cambiar el select abre el diálogo y NO llama a la API todavía", async () => {
    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(actualizarEstadoOrden).not.toHaveBeenCalled();
  });

  it("cancelar cierra el diálogo, no llama a la API y deja el select como estaba", async () => {
    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");
    await usuario.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actualizarEstadoOrden).not.toHaveBeenCalled();
    expect(select).toHaveValue("PENDIENTE");
  });

  it("notificar y guardar manda notificarCliente en true", async () => {
    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");
    await usuario.click(await screen.findByRole("button", { name: "Notificar y guardar" }));

    await waitFor(() => expect(actualizarEstadoOrden).toHaveBeenCalledWith("42", "CONFIRMADA", true));
  });

  it("guardar sin notificar manda notificarCliente en false", async () => {
    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");
    await usuario.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    await waitFor(() =>
      expect(actualizarEstadoOrden).toHaveBeenCalledWith("42", "CONFIRMADA", false),
    );
  });

  it("avisa cuando el estado se guardó pero el mail no salió", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      ...ORDEN,
      estado: "CONFIRMADA",
      notificacion: { intentada: true, enviada: false, error: "Invalid login" },
    });

    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");
    await usuario.click(await screen.findByRole("button", { name: "Notificar y guardar" }));

    expect(await screen.findByText(/no se pudo notificar al cliente/i)).toBeInTheDocument();
    expect(select).toHaveValue("CONFIRMADA");
  });

  it("no muestra el aviso cuando el mail salió bien", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      ...ORDEN,
      estado: "CONFIRMADA",
      notificacion: { intentada: true, enviada: true },
    });

    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");
    await usuario.click(await screen.findByRole("button", { name: "Notificar y guardar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByText(/no se pudo notificar al cliente/i)).not.toBeInTheDocument();
  });

  // Cubre el ruling que corrige el Step 3 del brief: `DialogoNotificarEstado`
  // no tiene prop de error, así que si el diálogo quedara abierto tras un
  // fallo, el mensaje se renderizaría tapado detrás del modal. Se cierra el
  // diálogo en el catch para que el error sea visible.
  it("ante un error al guardar, cierra el diálogo y deja el mensaje de error visible", async () => {
    actualizarEstadoOrden.mockRejectedValue(new Error("No se pudo actualizar."));

    const usuario = userEvent.setup();
    renderDetalle();
    const select = await screen.findByRole("combobox");

    await usuario.selectOptions(select, "CONFIRMADA");
    await usuario.click(await screen.findByRole("button", { name: "Notificar y guardar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("No se pudo actualizar.")).toBeInTheDocument();
    expect(select).toHaveValue("PENDIENTE");
  });
});
