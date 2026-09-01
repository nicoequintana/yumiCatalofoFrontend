import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminOperacion from "./AdminOperacion.jsx";
import * as adminOperacionApi from "../../api/adminOperacion.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/adminOperacion.js");

const RESUMEN = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  umbralEstancamientoDias: 3,
  stockBajoMaximo: 3,
  ordenesPorEstado: {
    PENDIENTE: 2,
    EN_PREPARACION: 1,
    ENTREGADA: 8,
    CANCELADA: 3,
  },
  ordenesEstancadas: {
    total: 2,
    lista: [
      {
        id: 7,
        estado: "PENDIENTE",
        diasSinCambios: 12,
        clienteNombre: "Ana Gómez",
        total: "200",
      },
      {
        id: 4,
        estado: "EN_PREPARACION",
        diasSinCambios: 5,
        clienteNombre: "Luis Paz",
        total: "50",
      },
    ],
  },
  antiguedadPromedio: { PENDIENTE: 3, EN_PREPARACION: 0 },
  quiebresConDemanda: [
    { productId: 2, nombre: "Perfume agotado", vistas: 40, stock: 0 },
    { productId: 3, nombre: "Jabón agotado", vistas: 9, stock: -1 },
  ],
  stockBajo: [
    { productId: 5, nombre: "Crema", stock: 1 },
    { productId: 6, nombre: "Aceite", stock: 3 },
  ],
};

const RESUMEN_TODO_EN_ORDEN = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  umbralEstancamientoDias: 3,
  stockBajoMaximo: 3,
  ordenesPorEstado: {
    PENDIENTE: 0,
    EN_PREPARACION: 0,
    ENTREGADA: 0,
    CANCELADA: 1,
  },
  ordenesEstancadas: { total: 0, lista: [] },
  antiguedadPromedio: { PENDIENTE: 0, EN_PREPARACION: 0 },
  quiebresConDemanda: [],
  stockBajo: [],
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/operacion"]}>
      <AdminOperacion />
    </MemoryRouter>,
  );
}

describe("AdminOperacion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminOperacionApi.getResumenOperacion.mockResolvedValue(RESUMEN);
  });

  it("muestra loading y luego el conteo de órdenes por estado", async () => {
    renderPagina();

    expect(screen.getByText("Cargando operación…")).toBeInTheDocument();

    const porEstado = await screen.findByLabelText("Órdenes por estado");
    expect(within(porEstado).getByText("Pendiente")).toBeInTheDocument();
    expect(within(porEstado).getByText("En preparación")).toBeInTheDocument();
    expect(within(porEstado).getByText("Entregada")).toBeInTheDocument();
  });

  it("muestra las órdenes estancadas de más a menos estancada, con link al detalle", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Órdenes estancadas");
    const filas = within(seccion).getAllByRole("row");

    // Primera fila es el encabezado; la segunda, la orden más estancada.
    expect(within(filas[1]).getByText("Ana Gómez")).toBeInTheDocument();
    expect(within(filas[1]).getByText("$ 200")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Luis Paz")).toBeInTheDocument();

    // Link accionable al detalle de la orden, para poder destrabarla.
    const link = within(filas[1]).getByRole("link");
    expect(link).toHaveAttribute("href", "/catalogo/admin/ordenes/7");
  });

  it("rotula el tiempo como 'sin cambios', nunca como tiempo en el estado", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Órdenes estancadas");

    // La métrica es `now - updatedAt`: tiempo desde el último cambio de
    // CUALQUIER tipo, no tiempo transcurrido dentro del estado actual. El
    // modelo Orden no guarda historial por estado, así que la UI no puede
    // prometer esa precisión.
    expect(within(seccion).getByRole("columnheader", { name: /sin cambios/i })).toBeInTheDocument();
    expect(
      within(seccion).getByText(/no el tiempo que la orden lleva en su estado actual/i),
    ).toBeInTheDocument();
    expect(within(seccion).queryByText(/tiempo en este estado/i)).not.toBeInTheDocument();
  });

  it("aclara la limitación del dato de updatedAt en la antigüedad promedio", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Antigüedad sin cambios");

    expect(within(seccion).getByText(/último cambio/i)).toBeInTheDocument();
    expect(within(seccion).queryByText(/tiempo en este estado/i)).not.toBeInTheDocument();
  });

  it("muestra los quiebres de stock con demanda ordenados por vistas", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Quiebres de stock con demanda");
    const filas = within(seccion).getAllByRole("row");

    expect(within(filas[1]).getByText("Perfume agotado")).toBeInTheDocument();
    expect(within(filas[1]).getByText("40")).toBeInTheDocument();
    expect(within(filas[2]).getByText("Jabón agotado")).toBeInTheDocument();
  });

  it("muestra los productos con stock bajo", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Stock bajo");
    expect(within(seccion).getByText("Crema")).toBeInTheDocument();
    expect(within(seccion).getByText("Aceite")).toBeInTheDocument();
  });

  it("el selector de período dispara un refetch con nuevas fechas", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByLabelText("Órdenes estancadas");
    vi.clearAllMocks();
    adminOperacionApi.getResumenOperacion.mockResolvedValue(RESUMEN);

    await user.click(screen.getByRole("button", { name: /7 días/i }));

    await waitFor(() => {
      expect(adminOperacionApi.getResumenOperacion).toHaveBeenCalledWith(
        expect.objectContaining({
          desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });
  });

  it("sin estancadas ni quiebres muestra un estado 'todo al día', no una pantalla rota", async () => {
    adminOperacionApi.getResumenOperacion.mockResolvedValue(RESUMEN_TODO_EN_ORDEN);

    renderPagina();

    // El caso real hoy: 0 estancadas y 0 quiebres. La pantalla tiene que
    // leerse como una confirmación, no como una tabla vacía o un error.
    expect(await screen.findByText("La operación está al día")).toBeInTheDocument();

    // Y el conteo por estado se sigue mostrando: sigue habiendo información útil.
    expect(screen.getByLabelText("Órdenes por estado")).toBeInTheDocument();
  });

  it("no muestra el aviso de período recortado cuando no hubo recorte", async () => {
    renderPagina();

    await screen.findByLabelText("Órdenes por estado");

    expect(screen.queryByTestId("advertencia-periodo-recortado")).not.toBeInTheDocument();
  });

  it("avisa cuando el backend recortó el período pedido", async () => {
    adminOperacionApi.getResumenOperacion.mockResolvedValue({
      ...RESUMEN,
      periodo: { desde: "2025-07-17", hasta: "2026-08-19", recortado: true },
    });

    renderPagina();

    const aviso = await screen.findByTestId("advertencia-periodo-recortado");
    expect(within(aviso).getByText(/supera el máximo/i)).toBeInTheDocument();
    expect(within(aviso).getByText(/17\/07\/2025/)).toBeInTheDocument();
  });

  it("no rompe si la respuesta no trae `periodo` (backend viejo)", async () => {
    const { periodo, ...sinPeriodo } = RESUMEN;
    expect(periodo).toBeDefined();
    adminOperacionApi.getResumenOperacion.mockResolvedValue(sinPeriodo);

    renderPagina();

    await screen.findByLabelText("Órdenes por estado");

    expect(screen.queryByTestId("advertencia-periodo-recortado")).not.toBeInTheDocument();
  });

  it("muestra un mensaje de error si la carga falla", async () => {
    adminOperacionApi.getResumenOperacion.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    expect(await screen.findByText("No autorizado.")).toBeInTheDocument();
  });

  it("la tabla de órdenes estancadas está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Órdenes estancadas");
    esperarTablaApilada(within(seccion).getByRole("table"));
  });

  it("la tabla de quiebres con demanda está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Quiebres de stock con demanda");
    esperarTablaApilada(within(seccion).getByRole("table"));
  });

  it("la tabla de stock bajo está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Stock bajo");
    esperarTablaApilada(within(seccion).getByRole("table"));
  });
});
