import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminLogs from "./AdminLogs.jsx";
import * as adminLogsApi from "../../api/adminLogs.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

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

  it("muestra el estado de error en vez de quedarse cargando para siempre", async () => {
    adminLogsApi.getAuditLogs.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    // El mensaje del backend no llega a pantalla: el copy es el compartido.
    expect(await screen.findByText("No se pudieron cargar los logs")).toBeInTheDocument();
    expect(screen.queryByText("Cargando logs…")).not.toBeInTheDocument();
  });

  it("la tabla de auditoría está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    await screen.findByText("admin@yima.test");
    esperarTablaApilada(screen.getByRole("table"));
  });

  it("la tabla de errores está apilable: cada celda declara su columna o su tipo", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("admin@yima.test");
    await user.click(screen.getByRole("button", { name: "Errores" }));
    await screen.findByText("Error interno del servidor.");

    esperarTablaApilada(screen.getByRole("table"));
  });
});

describe("AdminLogs — estado de error de carga", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("con la carga caída NO muestra además el estado vacío", async () => {
    // "No hay registros de auditoría" debajo de un error le afirma al operador
    // algo falso sobre la base: los registros pueden estar, lo que falló es la
    // consulta.
    adminLogsApi.getAuditLogs.mockRejectedValue(new Error("Error interno"));

    renderPagina();

    expect(await screen.findByText("No se pudieron cargar los logs")).toBeInTheDocument();
    expect(screen.queryByText("No hay registros de auditoría")).not.toBeInTheDocument();
  });

  it("no filtra el mensaje crudo del sistema: muestra el copy compartido con cloud_off", async () => {
    adminLogsApi.getAuditLogs.mockRejectedValue(new Error("Error interno"));

    renderPagina();

    await screen.findByText("No se pudieron cargar los logs");
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.queryByText("Error interno")).not.toBeInTheDocument();
  });

  it("Reintentar vuelve a pedir, y el fetch exitoso limpia el error", async () => {
    const user = userEvent.setup();
    adminLogsApi.getAuditLogs.mockRejectedValueOnce(new Error("Error interno"));
    adminLogsApi.getAuditLogs.mockResolvedValue({
      data: [AUDIT_LOG],
      page: 1,
      pageSize: 20,
      total: 1,
    });

    renderPagina();

    await screen.findByText("No se pudieron cargar los logs");
    await user.click(screen.getByRole("button", { name: /Reintentar/i }));

    expect(await screen.findByText("admin@yima.test")).toBeInTheDocument();
    expect(screen.queryByText("No se pudieron cargar los logs")).not.toBeInTheDocument();
  });
});
