import { render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PedidoDetalle from "./PedidoDetalle.jsx";
import usePedidosCliente, { reiniciarPedidosCliente } from "../../hooks/usePedidosCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

function renderConId(id) {
  return render(
    <MemoryRouter initialEntries={[`/cuenta/pedidos/${id}`]}>
      <Routes>
        <Route path="/cuenta/pedidos/:id" element={<PedidoDetalle />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** `mapOrdenCuenta` emite `lineas` junto a `items` (Task 14). */
function conLineas(pedido) {
  return { ...pedido, lineas: pedido.items.map((item) => ({ tipo: "PRODUCTO", item })) };
}

const PEDIDO = conLineas({
  id: 42,
  estado: "ENTREGADA",
  estadoEtiqueta: "Entregada",
  notas: null,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
  items: [{ nombreProducto: "Reloj Clásico", cantidad: 2, precioUnitario: "750", fotoPortada: null }],
  total: "1500",
});

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarPedidosCliente();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PedidoDetalle — éxito", () => {
  it("muestra el número de pedido, el estado y sus items", async () => {
    cuentaApi.getPedidoPorId.mockResolvedValue(PEDIDO);

    renderConId(42);

    expect(await screen.findByText("Pedido #42")).toBeInTheDocument();
    expect(screen.getByText(/Entregada/)).toBeInTheDocument();
    expect(screen.getByText(/Reloj Clásico/)).toBeInTheDocument();
    expect(cuentaApi.getPedidoPorId).toHaveBeenCalledWith("42");
  });

  it('tiene "Volver a mis pedidos" que lleva al listado', async () => {
    cuentaApi.getPedidoPorId.mockResolvedValue(PEDIDO);
    render(
      <MemoryRouter initialEntries={["/cuenta/pedidos/42"]}>
        <Routes>
          <Route path="/cuenta/pedidos/:id" element={<PedidoDetalle />} />
          <Route path="/cuenta/pedidos" element={<p>listado de pedidos</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: "Volver a mis pedidos" }));
    expect(screen.getByText("listado de pedidos")).toBeInTheDocument();
  });

  it("un combo se ve como UNA línea con su total y sus productos, sin precio por producto", async () => {
    cuentaApi.getPedidoPorId.mockResolvedValue({
      ...PEDIDO,
      items: [
        { nombreProducto: "Lámpara", cantidad: 2, precioUnitario: "8500", fotoPortada: null },
        { nombreProducto: "Mesa", cantidad: 1, precioUnitario: "21250", fotoPortada: null },
      ],
      lineas: [
        {
          tipo: "COMBO",
          comboId: 3,
          comboNombre: "Kit Living",
          comboCantidad: 1,
          productos: [
            { nombreProducto: "Lámpara", cantidad: 2 },
            { nombreProducto: "Mesa", cantidad: 1 },
          ],
          total: "38250",
        },
      ],
      total: "38250",
    });

    renderConId(42);

    expect(await screen.findByText("Kit Living × 1 — $ 38.250")).toBeInTheDocument();
    expect(screen.getByText("2× Lámpara · Mesa")).toBeInTheDocument();
    expect(screen.queryByText(/8\.500/)).not.toBeInTheDocument();
  });
});

describe("PedidoDetalle — 404", () => {
  it("muestra 'No encontramos ese pedido'", async () => {
    cuentaApi.getPedidoPorId.mockRejectedValue(
      Object.assign(new Error("no encontrado"), { status: 404 }),
    );

    renderConId(999);

    expect(await screen.findByText("No encontramos ese pedido")).toBeInTheDocument();
  });
});

describe("PedidoDetalle — error de red", () => {
  it("muestra el error de carga, DISTINTO del 404", async () => {
    cuentaApi.getPedidoPorId.mockRejectedValue(new Error("network down"));

    renderConId(42);

    expect(await screen.findByText("No pudimos cargar el pedido")).toBeInTheDocument();
    expect(screen.queryByText("No encontramos ese pedido")).not.toBeInTheDocument();
  });
});

describe("PedidoDetalle — sin ghosting (mismo bug que Mis pedidos)", () => {
  it("un pedido ya visto remonta con sus items, aunque el refetch no conteste", async () => {
    cuentaApi.getPedidoPorId.mockResolvedValueOnce(PEDIDO);
    const primero = renderConId(42);
    await screen.findByText(/Reloj Clásico/);
    primero.unmount();

    cuentaApi.getPedidoPorId.mockReturnValue(new Promise(() => {}));
    renderConId(42);

    expect(screen.getByText("Pedido #42")).toBeInTheDocument();
    expect(screen.getByText(/Reloj Clásico/)).toBeInTheDocument();
  });

  it("desde el listado cacheado, pinta YA la cabecera y el total con el resumen", async () => {
    cuentaApi.getPedidos.mockResolvedValueOnce({
      data: [{ id: 42, estado: "ENTREGADA", estadoEtiqueta: "Entregada", createdAt: PEDIDO.createdAt, total: "1500" }],
    });
    const lista = renderHook(() => usePedidosCliente());
    await waitFor(() => expect(lista.result.current.cargando).toBe(false));
    lista.unmount();

    cuentaApi.getPedidoPorId.mockReturnValue(new Promise(() => {}));
    renderConId(42);

    expect(screen.getByText("Pedido #42")).toBeInTheDocument();
    expect(screen.getByText(/Entregada/)).toBeInTheDocument();
    expect(screen.getByText(/Total:/)).toBeInTheDocument();
  });
});
