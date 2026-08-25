import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminLogs from "./AdminLogs.jsx";
import * as adminLogsApi from "../../api/adminLogs.js";

vi.mock("../../api/adminLogs.js");

const AUDIT_LOG = {
  id: 1,
  usuarioId: 7,
  usuarioEmail: "admin@yima.test",
  accion: "ACTUALIZAR_ESTADO",
  entidad: "Orden",
  entidadId: 100,
  detalle: JSON.stringify({ estadoAnterior: "PENDIENTE", estadoNuevo: "CONFIRMADA" }),
  ruta: "/api/ordenes/100/estado",
  metodo: "PATCH",
  ip: "10.0.0.1",
  createdAt: "2026-08-01T00:00:00.000Z",
};

const ERROR_LOG = {
  id: 55,
  mensaje: "Error interno del servidor.",
  stack: "Error: algo explotó\n    at foo.js:1:1",
  ruta: "/api/products",
  metodo: "GET",
  status: 500,
  createdAt: "2026-08-02T00:00:00.000Z",
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/logs"]}>
      <AdminLogs />
    </MemoryRouter>,
  );
}

describe("AdminLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminLogsApi.getAuditLogs.mockResolvedValue({
      data: [AUDIT_LOG],
      page: 1,
      pageSize: 20,
      total: 1,
    });
    adminLogsApi.getErrorLogs.mockResolvedValue({
      data: [ERROR_LOG],
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it("muestra loading y luego la tabla de auditoría (pestaña por defecto)", async () => {
    renderPagina();

    expect(screen.getByText("Cargando logs…")).toBeInTheDocument();

    expect(await screen.findByText("admin@yima.test")).toBeInTheDocument();
    // "Orden" aparece también como <option> del filtro por entidad, así que
    // se busca puntualmente la celda de la tabla.
    expect(screen.getByRole("cell", { name: "Orden" })).toBeInTheDocument();
    expect(screen.getByText("#100")).toBeInTheDocument();
    expect(adminLogsApi.getAuditLogs).toHaveBeenCalled();
    expect(adminLogsApi.getErrorLogs).not.toHaveBeenCalled();
  });

  it("al cambiar a la pestaña Errores carga el feed de errores", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("admin@yima.test");

    await user.click(screen.getByRole("button", { name: "Errores" }));

    expect(await screen.findByText("Error interno del servidor.")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(adminLogsApi.getErrorLogs).toHaveBeenCalled();
  });

  it("el stack trace arranca colapsado y se expande al hacer click", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("admin@yima.test");
    await user.click(screen.getByRole("button", { name: "Errores" }));
    await screen.findByText("Error interno del servidor.");

    expect(screen.queryByText(/algo explotó/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ver stack/i }));

    expect(await screen.findByText(/algo explotó/)).toBeInTheDocument();
  });

  it("muestra estado vacío cuando no hay registros de auditoría", async () => {
    adminLogsApi.getAuditLogs.mockResolvedValue({ data: [], page: 1, pageSize: 20, total: 0 });

    renderPagina();

    expect(await screen.findByText("No hay registros de auditoría")).toBeInTheDocument();
  });

  it("el filtro por entidad dispara un refetch y resetea a página 1", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("admin@yima.test");
    vi.clearAllMocks();
    adminLogsApi.getAuditLogs.mockResolvedValue({
      data: [AUDIT_LOG],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    await user.selectOptions(screen.getByLabelText("Filtrar por entidad"), "Producto");

    await waitFor(() => {
      expect(adminLogsApi.getAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({ entidad: "Producto", page: 1 }),
      );
    });
  });

  it("los botones de paginación piden la página actualizada", async () => {
    const user = userEvent.setup();
    adminLogsApi.getAuditLogs.mockResolvedValue({
      data: [AUDIT_LOG],
      page: 1,
      pageSize: 1,
      total: 2,
    });

    renderPagina();

    await screen.findByText("admin@yima.test");

    const btnAnterior = screen.getByRole("button", { name: "Anterior" });
    const btnSiguiente = screen.getByRole("button", { name: "Siguiente" });
    expect(btnAnterior).toBeDisabled();
    expect(btnSiguiente).not.toBeDisabled();

    vi.clearAllMocks();
    adminLogsApi.getAuditLogs.mockResolvedValue({
      data: [AUDIT_LOG],
      page: 2,
      pageSize: 1,
      total: 2,
    });

    await user.click(btnSiguiente);

    await waitFor(() => {
      expect(adminLogsApi.getAuditLogs).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it("muestra un mensaje de error si la carga falla", async () => {
    adminLogsApi.getAuditLogs.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    expect(await screen.findByText("No autorizado.")).toBeInTheDocument();
  });
});
