import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminClientes from "./AdminClientes.jsx";
import * as adminClientesApi from "../../api/adminClientes.js";

vi.mock("../../api/adminClientes.js");

const RESUMEN = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  totalClientes: 4,
  clientesNuevos: 3,
  clientesRecurrentes: 1,
  ingresosPeriodo: "7000.00",
  valorPromedioPorCliente: "1750.00",
  tasaRecompra: 0.25,
  tiempoEntreCompras: 12.5,
  rankingClientes: [
    { dni: "30111222", nombre: "Ana", cantidadOrdenes: 2, facturacion: "7000.00" },
    { dni: "28333444", nombre: "Beto", cantidadOrdenes: 1, facturacion: "5000.00" },
  ],
};

/**
 * Estado real de los datos hoy: tres clientes, una compra cada uno. Nadie
 * repitió, así que no hay tiempo entre compras que medir.
 */
const RESUMEN_SIN_RECOMPRAS = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  totalClientes: 3,
  clientesNuevos: 3,
  clientesRecurrentes: 0,
  ingresosPeriodo: "3000.00",
  valorPromedioPorCliente: "1000.00",
  tasaRecompra: 0,
  tiempoEntreCompras: null,
  rankingClientes: [
    { dni: "30111222", nombre: "Ana", cantidadOrdenes: 1, facturacion: "1500.00" },
  ],
};

const RESUMEN_VACIO = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  totalClientes: 0,
  clientesNuevos: 0,
  clientesRecurrentes: 0,
  ingresosPeriodo: "0.00",
  valorPromedioPorCliente: "0.00",
  tasaRecompra: 0,
  tiempoEntreCompras: null,
  rankingClientes: [],
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/clientes"]}>
      <AdminClientes />
    </MemoryRouter>,
  );
}

describe("AdminClientes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminClientesApi.getResumenClientes.mockResolvedValue(RESUMEN);
  });

  it("muestra loading y luego las tarjetas de métricas principales", async () => {
    renderPagina();

    expect(screen.getByText("Cargando clientes…")).toBeInTheDocument();

    expect(await screen.findByText("$ 1.750,00")).toBeInTheDocument();

    const resumen = screen.getByLabelText("Resumen de clientes");
    expect(within(resumen).getByText("Clientes")).toBeInTheDocument();
    expect(within(resumen).getByText("4")).toBeInTheDocument();
  });

  it("muestra el desglose de nuevos vs. recurrentes", async () => {
    renderPagina();

    const desglose = await screen.findByTestId("desglose-clientes");

    expect(within(desglose).getByText(/3/)).toBeInTheDocument();
    expect(within(desglose).getByText(/nuevos/i)).toBeInTheDocument();
    expect(within(desglose).getByText(/recurrentes/i)).toBeInTheDocument();
  });

  it("muestra la tasa de recompra como porcentaje", async () => {
    renderPagina();

    await screen.findByText("$ 1.750,00");

    expect(screen.getByText("25.0%")).toBeInTheDocument();
  });

  it("muestra el tiempo entre compras en días cuando hay dato", async () => {
    renderPagina();

    const tarjeta = await screen.findByTestId("tiempo-entre-compras");

    expect(within(tarjeta).getByText("12.5 días")).toBeInTheDocument();
  });

  it("muestra 'sin datos suficientes' cuando nadie repitió, nunca '0 días'", async () => {
    adminClientesApi.getResumenClientes.mockResolvedValue(RESUMEN_SIN_RECOMPRAS);

    renderPagina();

    const tarjeta = await screen.findByTestId("tiempo-entre-compras");

    // Este es el punto honesto de la pantalla: sin recompras no hay promedio
    // que mostrar. Un "0 días" diría que vuelven a comprar el mismo día.
    expect(within(tarjeta).getByText(/sin datos suficientes/i)).toBeInTheDocument();
    expect(within(tarjeta).queryByText(/0 días/)).not.toBeInTheDocument();
  });

  it("muestra el ranking de clientes ordenado por facturación", async () => {
    renderPagina();

    await screen.findByText("$ 1.750,00");

    const filas = screen.getAllByRole("row");
    // La primera fila es el encabezado.
    expect(within(filas[1]).getByText("Ana")).toBeInTheDocument();
    expect(within(filas[1]).getByText("$ 7.000,00")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Beto")).toBeInTheDocument();
  });

  it("muestra el DNI de cada cliente del ranking", async () => {
    renderPagina();

    await screen.findByText("$ 1.750,00");

    // El DNI es la identidad del cliente en el checkout de invitado: sin él,
    // dos clientes con el mismo nombre son indistinguibles.
    expect(screen.getByText("30111222")).toBeInTheDocument();
  });

  it("el selector de período dispara un refetch con nuevas fechas", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("$ 1.750,00");
    vi.clearAllMocks();
    adminClientesApi.getResumenClientes.mockResolvedValue(RESUMEN);

    await user.click(screen.getByRole("button", { name: /7 días/i }));

    await waitFor(() => {
      expect(adminClientesApi.getResumenClientes).toHaveBeenCalledWith(
        expect.objectContaining({
          desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });
  });

  it("muestra estado vacío cuando no hubo clientes en el período", async () => {
    adminClientesApi.getResumenClientes.mockResolvedValue(RESUMEN_VACIO);

    renderPagina();

    expect(await screen.findByText("No hubo clientes en este período")).toBeInTheDocument();
  });

  it("muestra un mensaje de error si la carga falla", async () => {
    adminClientesApi.getResumenClientes.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    expect(await screen.findByText("No autorizado.")).toBeInTheDocument();
  });
});
