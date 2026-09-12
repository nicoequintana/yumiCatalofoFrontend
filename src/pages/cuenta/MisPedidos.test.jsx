import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MisPedidos from "./MisPedidos.jsx";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

function renderMisPedidos() {
  return render(
    <MemoryRouter>
      <MisPedidos />
    </MemoryRouter>,
  );
}

const PEDIDO = {
  id: 42,
  estado: "ENTREGADA",
  estadoEtiqueta: "Entregada",
  createdAt: "2026-09-01T12:00:00.000Z",
  total: "1500",
  cantidadItems: 2,
  resumen: [{ nombreProducto: "Reloj Clásico", cantidad: 2 }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MisPedidos — con pedidos", () => {
  it("lista cada pedido con un link al detalle", async () => {
    cuentaApi.getPedidos.mockResolvedValue({ data: [PEDIDO], page: 1, pageSize: 20, total: 1 });

    renderMisPedidos();

    const link = await screen.findByRole("link", { name: /Pedido #42/ });
    expect(link).toHaveAttribute("href", "/cuenta/pedidos/42");
    expect(screen.getByText(/Entregada/)).toBeInTheDocument();
  });
});

describe("MisPedidos — vacío real", () => {
  it("muestra el estado vacío SIN el error de carga", async () => {
    cuentaApi.getPedidos.mockResolvedValue({ data: [], page: 1, pageSize: 20, total: 0 });

    renderMisPedidos();

    expect(await screen.findByText("Todavía no hiciste ningún pedido")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tus pedidos")).not.toBeInTheDocument();
  });
});

describe("MisPedidos — error de carga", () => {
  it("muestra el estado de error, DISTINTO del vacío, con Reintentar", async () => {
    cuentaApi.getPedidos.mockRejectedValue(new Error("network down"));

    renderMisPedidos();

    expect(await screen.findByText("No pudimos cargar tus pedidos")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hiciste ningún pedido")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeInTheDocument();
  });

  it("un fetch exitoso posterior limpia el error", async () => {
    const user = userEvent.setup();
    cuentaApi.getPedidos.mockRejectedValueOnce(new Error("network down"));
    cuentaApi.getPedidos.mockResolvedValueOnce({ data: [PEDIDO], page: 1, pageSize: 20, total: 1 });

    renderMisPedidos();
    await screen.findByText("No pudimos cargar tus pedidos");

    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() =>
      expect(screen.queryByText("No pudimos cargar tus pedidos")).not.toBeInTheDocument(),
    );
    expect(await screen.findByRole("link", { name: /Pedido #42/ })).toBeInTheDocument();
  });
});
