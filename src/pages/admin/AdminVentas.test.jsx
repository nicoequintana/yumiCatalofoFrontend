import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminVentas from "./AdminVentas.jsx";
import * as adminVentasApi from "../../api/adminVentas.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/adminVentas.js");

/** Histórico completo: el backend analizó todas las órdenes, sin tocar el tope. */
const HISTORICO_COMPLETO = { ordenesAnalizadas: 120, tope: 20000, recortado: false };

const RESUMEN = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19" },
  historico: HISTORICO_COMPLETO,
  ingresosTotales: "3500",
  cantidadOrdenes: 2,
  ticketPromedio: "1750",
  unidadesVendidas: 4,
  productosPorOrden: 1.5,
  // EN_PREPARACION + ENTREGADA suman los mismos $3.500 de `ingresosTotales`
  // (1200 + 2300) — mismo criterio que el resto de la suite, pero con montos
  // que no coinciden con "$ 1.750" (ticketPromedio), que otro test ya busca
  // sin scope.
  porEstado: [
    { estado: "PENDIENTE", cantidadOrdenes: 3, venta: "1998", costo: "1000", ventaConCosto: "1998" },
    { estado: "EN_PREPARACION", cantidadOrdenes: 1, venta: "1200", costo: "600", ventaConCosto: "1200" },
    { estado: "ENTREGADA", cantidadOrdenes: 1, venta: "2300", costo: "1150", ventaConCosto: "2300" },
    { estado: "CANCELADA", cantidadOrdenes: 1, venta: "500", costo: "250", ventaConCosto: "500" },
  ],
  ordenesCanceladas: 1,
  tasaCancelacion: 0.25,
  rankingProductos: [
    { productId: 2, nombre: "Perfume", unidades: 2, facturacion: "1000" },
    { productId: 1, nombre: "Jabón", unidades: 10, facturacion: "100" },
  ],
  serieTemporal: [
    { fecha: "2026-08-10", ingresos: "150" },
    { fecha: "2026-08-11", ingresos: "0" },
    { fecha: "2026-08-12", ingresos: "25" },
  ],
};

/**
 * El histórico tocó el tope de 20.000 órdenes: se perdieron las órdenes más
 * viejas, así que los totales del período pasan a ser un piso.
 */
const RESUMEN_RECORTADO = {
  ...RESUMEN,
  historico: { ordenesAnalizadas: 20000, tope: 20000, recortado: true },
};

const RESUMEN_VACIO = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19" },
  historico: HISTORICO_COMPLETO,
  ingresosTotales: "0",
  cantidadOrdenes: 0,
  ticketPromedio: "0",
  unidadesVendidas: 0,
  productosPorOrden: 0,
  porEstado: [
    { estado: "PENDIENTE", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
    { estado: "EN_PREPARACION", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
    { estado: "ENTREGADA", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
    { estado: "CANCELADA", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
  ],
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

/** Monta la pantalla con `RESUMEN` de base, pisado por lo que traiga `parcial`. */
function renderConResumen(parcial = {}) {
  adminVentasApi.getResumenVentas.mockResolvedValue({ ...RESUMEN, ...parcial });
  return renderPagina();
}

describe("AdminVentas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminVentasApi.getResumenVentas.mockResolvedValue(RESUMEN);
  });

  it("el botón Actualizar vuelve a pedir el resumen sin perder el período", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByTestId("estado-PENDIENTE");
    expect(adminVentasApi.getResumenVentas).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Actualizar" }));

    // Un segundo fetch, con el MISMO rango: refrescar no es cambiar de período.
    await waitFor(() =>
      expect(adminVentasApi.getResumenVentas).toHaveBeenCalledTimes(2),
    );
    const [primera, segunda] = adminVentasApi.getResumenVentas.mock.calls;
    expect(segunda).toEqual(primera);
  });

  it("muestra loading y luego las tarjetas de métricas principales", async () => {
    renderPagina();

    expect(screen.getByText("Cargando ventas…")).toBeInTheDocument();

    expect(await screen.findByText("$ 3.500")).toBeInTheDocument();
    expect(screen.getByText("$ 1.750")).toBeInTheDocument();

    // Órdenes y unidades se buscan dentro del resumen: un "2" suelto también
    // aparece como número de fila en el ranking.
    const resumen = screen.getByLabelText("Resumen de facturación");
    expect(within(resumen).getByText("Órdenes")).toBeInTheDocument();
    expect(within(resumen).getByText("2")).toBeInTheDocument();
    expect(within(resumen).getByText("4")).toBeInTheDocument();
    expect(within(resumen).getByText("1.5 productos por orden")).toBeInTheDocument();
  });

  it("muestra la tarjeta de pendientes separada del resumen de ingresos", async () => {
    renderPagina();

    const pendiente = await screen.findByTestId("estado-PENDIENTE");

    // El valor pendiente vive en su propia tarjeta, no entre las de ingresos
    // — no se puede leer como plata ya facturada.
    expect(within(pendiente).getByText("$ 1.998")).toBeInTheDocument();
    expect(within(pendiente).getByText("3 órdenes")).toBeInTheDocument();

    // Y sobre todo: el monto pendiente NO está dentro del resumen de
    // ingresos, que es lo que lo haría confundible con plata ya facturada.
    const resumen = screen.getByLabelText("Resumen de facturación");
    expect(within(resumen).queryByText("$ 1.998")).not.toBeInTheDocument();
  });

  it("muestra el ranking de productos ordenado por facturación", async () => {
    renderPagina();

    await screen.findByText("$ 3.500");

    const filas = screen.getAllByRole("row");
    // Primera fila es el encabezado; la segunda debe ser el producto que más
    // factura, aunque no sea el de más unidades.
    expect(within(filas[1]).getByText("Perfume")).toBeInTheDocument();
    expect(within(filas[1]).getByText("$ 1.000")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Jabón")).toBeInTheDocument();
  });

  it("la tabla del ranking está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Ranking de productos");
    esperarTablaApilada(within(seccion).getByRole("table"));
  });

  it("renderiza la serie temporal sin librería de gráficos", async () => {
    const { container } = renderPagina();

    await screen.findByText("$ 3.500");

    // Gráfico inline en SVG: sin dependencias externas.
    const grafico = container.querySelector("svg");
    expect(grafico).toBeInTheDocument();
    expect(screen.getByTestId("grafico-ingresos")).toBeInTheDocument();
  });

  it("el selector de período dispara un refetch con nuevas fechas", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("$ 3.500");
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

  it("no muestra la advertencia de histórico cuando no hubo recorte", async () => {
    renderPagina();

    await screen.findByText("$ 3.500");

    expect(screen.queryByTestId("advertencia-historico")).not.toBeInTheDocument();
  });

  it("avisa que los totales son un piso cuando el histórico se recortó", async () => {
    adminVentasApi.getResumenVentas.mockResolvedValue(RESUMEN_RECORTADO);

    renderPagina();

    const aviso = await screen.findByTestId("advertencia-historico");

    // El aviso tiene que decir que los números son un MÍNIMO, no un total, y
    // mostrar cuántas órdenes se alcanzaron a analizar.
    expect(
      within(aviso).getByText("Estos números son un mínimo, no el total"),
    ).toBeInTheDocument();
    expect(within(aviso).getByText(/20\.000/)).toBeInTheDocument();
    expect(within(aviso).getByText(/quedaron afuera/i)).toBeInTheDocument();
  });

  it("no muestra la advertencia de histórico sobre el estado vacío", async () => {
    adminVentasApi.getResumenVentas.mockResolvedValue({
      ...RESUMEN_VACIO,
      historico: { ordenesAnalizadas: 20000, tope: 20000, recortado: true },
    });

    renderPagina();

    await screen.findByText("No hubo ventas en este período");

    expect(screen.queryByTestId("advertencia-historico")).not.toBeInTheDocument();
  });

  it("no rompe si la respuesta no trae `historico` (backend viejo)", async () => {
    const { historico, ...sinHistorico } = RESUMEN_RECORTADO;
    expect(historico).toBeDefined();
    adminVentasApi.getResumenVentas.mockResolvedValue(sinHistorico);

    renderPagina();

    await screen.findByText("$ 3.500");

    expect(screen.queryByTestId("advertencia-historico")).not.toBeInTheDocument();
  });

  it("no muestra el aviso de período recortado cuando no hubo recorte", async () => {
    renderPagina();

    await screen.findByText("$ 3.500");

    expect(screen.queryByTestId("advertencia-periodo-recortado")).not.toBeInTheDocument();
  });

  it("avisa cuando el backend recortó el período pedido", async () => {
    adminVentasApi.getResumenVentas.mockResolvedValue({
      ...RESUMEN,
      periodo: { desde: "2025-07-17", hasta: "2026-08-19", recortado: true },
    });

    renderPagina();

    const aviso = await screen.findByTestId("advertencia-periodo-recortado");
    expect(within(aviso).getByText(/supera el máximo/i)).toBeInTheDocument();
    expect(within(aviso).getByText(/17\/07\/2025/)).toBeInTheDocument();
  });

  it("avisa del recorte también sobre el estado vacío", async () => {
    // Un período vacío sobre una ventana que no es la pedida es justo el caso
    // donde callar el recorte más confunde: "no hubo ventas" respondería a
    // otra pregunta.
    adminVentasApi.getResumenVentas.mockResolvedValue({
      ...RESUMEN_VACIO,
      periodo: { desde: "2025-07-17", hasta: "2026-08-19", recortado: true },
    });

    renderPagina();

    expect(await screen.findByText("No hubo ventas en este período")).toBeInTheDocument();
    expect(screen.getByTestId("advertencia-periodo-recortado")).toBeInTheDocument();
  });

  it("no rompe si la respuesta no trae `periodo` (backend viejo)", async () => {
    const { periodo, ...sinPeriodo } = RESUMEN;
    expect(periodo).toBeDefined();
    adminVentasApi.getResumenVentas.mockResolvedValue(sinPeriodo);

    renderPagina();

    await screen.findByText("$ 3.500");

    expect(screen.queryByTestId("advertencia-periodo-recortado")).not.toBeInTheDocument();
  });

  it("muestra un mensaje de error si la carga falla", async () => {
    adminVentasApi.getResumenVentas.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    expect(await screen.findByText("No autorizado.")).toBeInTheDocument();
  });

  describe("órdenes por estado", () => {
    it("muestra venta y costo en los tres estados con plata", async () => {
      renderConResumen({
        porEstado: [
          { estado: "PENDIENTE", cantidadOrdenes: 2, venta: "8000", costo: "3400", ventaConCosto: "8000" },
          { estado: "EN_PREPARACION", cantidadOrdenes: 5, venta: "30000", costo: "15000", ventaConCosto: "30000" },
          { estado: "ENTREGADA", cantidadOrdenes: 7, venta: "52000", costo: "26500", ventaConCosto: "52000" },
          { estado: "CANCELADA", cantidadOrdenes: 1, venta: "4000", costo: "1700", ventaConCosto: "4000" },
        ],
      });

      const preparacion = await screen.findByTestId("estado-EN_PREPARACION");
      expect(preparacion).toHaveTextContent("$ 30.000");
      expect(preparacion).toHaveTextContent("$ 15.000");
      expect(preparacion).toHaveTextContent("5 órdenes");
    });

    it("la tarjeta de canceladas no muestra montos", async () => {
      renderConResumen({
        porEstado: [
          { estado: "PENDIENTE", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "EN_PREPARACION", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "ENTREGADA", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "CANCELADA", cantidadOrdenes: 1, venta: "4000", costo: "1700", ventaConCosto: "4000" },
        ],
      });

      const cancelada = await screen.findByTestId("estado-CANCELADA");
      expect(cancelada).toHaveTextContent("1 orden");
      expect(cancelada).not.toHaveTextContent("$ 4.000");
    });

    it("avisa cuando hay ventas sin costo registrado", async () => {
      renderConResumen({
        porEstado: [
          { estado: "PENDIENTE", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "EN_PREPARACION", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "ENTREGADA", cantidadOrdenes: 7, venta: "52000", costo: "26500", ventaConCosto: "48000" },
          { estado: "CANCELADA", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
        ],
      });

      const aviso = await screen.findByTestId("aviso-cobertura-costo");
      expect(aviso).toHaveTextContent("$ 48.000");
      expect(aviso).toHaveTextContent("$ 52.000");
    });

    it("no avisa nada cuando todas las ventas tienen costo", async () => {
      renderConResumen({
        porEstado: [
          { estado: "PENDIENTE", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "EN_PREPARACION", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "ENTREGADA", cantidadOrdenes: 7, venta: "52000", costo: "26500", ventaConCosto: "52000" },
          { estado: "CANCELADA", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
        ],
      });

      await screen.findByTestId("estado-ENTREGADA");
      expect(screen.queryByTestId("aviso-cobertura-costo")).toBeNull();
    });

    it("no avisa por un faltante de costo que vive solo en CANCELADA, plata que la pantalla no muestra", async () => {
      // ENTREGADA tiene cobertura perfecta (venta === ventaConCosto); el único
      // faltante está en CANCELADA, una tarjeta sin montos por diseño. El
      // aviso de cobertura no puede nombrar una plata que no aparece en
      // ningún lado de la pantalla.
      renderConResumen({
        porEstado: [
          { estado: "PENDIENTE", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "EN_PREPARACION", cantidadOrdenes: 0, venta: "0", costo: "0", ventaConCosto: "0" },
          { estado: "ENTREGADA", cantidadOrdenes: 7, venta: "52000", costo: "26500", ventaConCosto: "52000" },
          { estado: "CANCELADA", cantidadOrdenes: 1, venta: "4000", costo: "0", ventaConCosto: "0" },
        ],
      });

      await screen.findByTestId("estado-ENTREGADA");
      expect(screen.queryByTestId("aviso-cobertura-costo")).toBeNull();
    });
  });
});
