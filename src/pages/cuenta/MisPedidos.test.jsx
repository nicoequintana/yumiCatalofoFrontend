import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MisPedidos from "./MisPedidos.jsx";
import { reiniciarPedidosCliente } from "../../hooks/usePedidosCliente.js";
import * as cuentaApi from "../../api/cuenta.js";
import { precargarPedidoDetalle } from "./cargarPedidoDetalle.js";

vi.mock("../../api/cuenta.js");
vi.mock("./cargarPedidoDetalle.js", () => ({ precargarPedidoDetalle: vi.fn() }));

function renderMisPedidos() {
  return render(
    <MemoryRouter>
      <MisPedidos />
    </MemoryRouter>,
  );
}

function nuncaContesta() {
  return new Promise(() => {});
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
  reiniciarPedidosCliente();
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

  it('tiene "Volver a mi cuenta" que lleva a /cuenta', async () => {
    cuentaApi.getPedidos.mockResolvedValue({ data: [PEDIDO], page: 1, pageSize: 20, total: 1 });
    render(
      <MemoryRouter initialEntries={["/cuenta/pedidos"]}>
        <Routes>
          <Route path="/cuenta/pedidos" element={<MisPedidos />} />
          <Route path="/cuenta" element={<p>pantalla mi cuenta</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Volver a mi cuenta" }));
    expect(screen.getByText("pantalla mi cuenta")).toBeInTheDocument();
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

describe("MisPedidos — sin ghosting al remontar (mismo bug que carrito/checkout)", () => {
  it("con cache no se pinta nada de carga al remontar, aunque el refetch no conteste", async () => {
    cuentaApi.getPedidos.mockResolvedValueOnce({ data: [PEDIDO], page: 1, pageSize: 20, total: 1 });
    const primero = renderMisPedidos();
    await screen.findByRole("link", { name: /Pedido #42/ });
    primero.unmount();

    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());
    renderMisPedidos();

    expect(await screen.findByRole("link", { name: /Pedido #42/ })).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hiciste ningún pedido")).not.toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar tus pedidos")).not.toBeInTheDocument();
  });

  it("el cache de una cuenta no sobrevive a un cambio de sesión", async () => {
    cuentaApi.getPedidos.mockResolvedValueOnce({ data: [PEDIDO], page: 1, pageSize: 20, total: 1 });
    const primero = renderMisPedidos();
    await screen.findByRole("link", { name: /Pedido #42/ });
    primero.unmount();

    reiniciarPedidosCliente();
    cuentaApi.getPedidos.mockResolvedValueOnce({ data: [], page: 1, pageSize: 20, total: 0 });
    renderMisPedidos();

    expect(await screen.findByText("Todavía no hiciste ningún pedido")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Pedido #42/ })).not.toBeInTheDocument();
  });
});

describe("MisPedidos — precarga del detalle", () => {
  it("al montar precarga el chunk del detalle (sin spinner de Suspense al abrir un pedido)", async () => {
    cuentaApi.getPedidos.mockReturnValue(nuncaContesta());

    renderMisPedidos();

    expect(precargarPedidoDetalle).toHaveBeenCalled();
  });
});
