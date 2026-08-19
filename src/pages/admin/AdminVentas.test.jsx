import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminVentas from "./AdminVentas.jsx";
import * as adminVentasApi from "../../api/adminVentas.js";

vi.mock("../../api/adminVentas.js");

const RESUMEN = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19" },
  ingresosTotales: "3500.50",
  cantidadOrdenes: 2,
  ticketPromedio: "1750.25",
  unidadesVendidas: 4,
  productosPorOrden: 1.5,
  pipeline: { cantidadOrdenes: 3, valorTotal: "1999.98" },
  ordenesCanceladas: 1,
  tasaCancelacion: 0.25,
  rankingProductos: [
    { productId: 2, nombre: "Perfume", unidades: 2, facturacion: "1000.00" },
    { productId: 1, nombre: "Jabón", unidades: 10, facturacion: "100.00" },
  ],
  serieTemporal: [
    { fecha: "2026-08-10", ingresos: "150.00" },
    { fecha: "2026-08-11", ingresos: "0.00" },
    { fecha: "2026-08-12", ingresos: "25.00" },
  ],
};

const RESUMEN_VACIO = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19" },
  ingresosTotales: "0.00",
  cantidadOrdenes: 0,
  ticketPromedio: "0.00",
  unidadesVendidas: 0,
  productosPorOrden: 0,
  pipeline: { cantidadOrdenes: 0, valorTotal: "0.00" },
  ordenesCanceladas: 0,
  tasaCancelacion: 0,
  rankingProductos: [],
  serieTemporal: [],
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/ventas"]}>
      <AdminVentas />
    </MemoryRouter>,
  );
}

describe("AdminVentas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminVentasApi.getResumenVentas.mockResolvedValue(RESUMEN);
  });

  it("muestra loading y luego las tarjetas de métricas principales", async () => {
    renderPagina();

    expect(screen.getByText("Cargando ventas…")).toBeInTheDocument();

    expect(await screen.findByText("$ 3.500,50")).toBeInTheDocument();
    expect(screen.getByText("$ 1.750,25")).toBeInTheDocument();

    // Órdenes y unidades se buscan dentro del resumen: un "2" suelto también
    // aparece como número de fila en el ranking.
    const resumen = screen.getByLabelText("Resumen de facturación");
    expect(within(resumen).getByText("Órdenes")).toBeInTheDocument();
    expect(within(resumen).getByText("2")).toBeInTheDocument();
    expect(within(resumen).getByText("4")).toBeInTheDocument();
    expect(within(resumen).getByText("1.5 productos por orden")).toBeInTheDocument();
  });

  it("muestra el pipeline separado del ingreso y etiquetado como pendiente", async () => {
    renderPagina();

    const pipeline = await screen.findByTestId("pipeline");

    // El valor del pipeline vive en su propia región, no entre las tarjetas
    // de ingresos — no se puede leer como plata ya facturada.
    expect(within(pipeline).getByText("$ 1.999,98")).toBeInTheDocument();
    expect(within(pipeline).getByText(/pendiente de confirmar/i)).toBeInTheDocument();
    expect(within(pipeline).getByText(/todavía no cuenta como ingreso/i)).toBeInTheDocument();

    // Y sobre todo: el monto del pipeline NO está dentro del resumen de
    // ingresos, que es lo que lo haría confundible con plata ya facturada.
    const resumen = screen.getByLabelText("Resumen de facturación");
    expect(within(resumen).queryByText("$ 1.999,98")).not.toBeInTheDocument();
  });

  it("muestra el ranking de productos ordenado por facturación", async () => {
    renderPagina();

    await screen.findByText("$ 3.500,50");

    const filas = screen.getAllByRole("row");
    // Primera fila es el encabezado; la segunda debe ser el producto que más
    // factura, aunque no sea el de más unidades.
    expect(within(filas[1]).getByText("Perfume")).toBeInTheDocument();
    expect(within(filas[1]).getByText("$ 1.000,00")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Jabón")).toBeInTheDocument();
  });

  it("renderiza la serie temporal sin librería de gráficos", async () => {
    const { container } = renderPagina();

    await screen.findByText("$ 3.500,50");

    // Gráfico inline en SVG: sin dependencias externas.
    const grafico = container.querySelector("svg");
    expect(grafico).toBeInTheDocument();
    expect(screen.getByTestId("grafico-ingresos")).toBeInTheDocument();
  });

  it("el selector de período dispara un refetch con nuevas fechas", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("$ 3.500,50");
    vi.clearAllMocks();
    adminVentasApi.getResumenVentas.mockResolvedValue(RESUMEN);

    await user.click(screen.getByRole("button", { name: /7 días/i }));

    await waitFor(() => {
      expect(adminVentasApi.getResumenVentas).toHaveBeenCalledWith(
        expect.objectContaining({
          desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });
  });

  it("muestra estado vacío cuando no hubo ventas en el período", async () => {
    adminVentasApi.getResumenVentas.mockResolvedValue(RESUMEN_VACIO);

    renderPagina();

    expect(await screen.findByText("No hubo ventas en este período")).toBeInTheDocument();
  });

  it("muestra un mensaje de error si la carga falla", async () => {
    adminVentasApi.getResumenVentas.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    expect(await screen.findByText("No autorizado.")).toBeInTheDocument();
  });
});
