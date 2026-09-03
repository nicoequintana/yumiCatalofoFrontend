import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DndContext } from "@dnd-kit/core";
import ColumnaOrdenes from "./ColumnaOrdenes.jsx";

const ESTADOS = [
  { valor: "PENDIENTE", etiqueta: "Pendiente", terminal: false },
  { valor: "ENTREGADA", etiqueta: "Entregada", terminal: true },
];

const ESTADO = ESTADOS[0];

function orden(id) {
  return {
    id,
    estado: "PENDIENTE",
    estadoEtiqueta: "Pendiente",
    cliente: { nombre: `Cliente ${id}` },
    total: "1000",
    cantidadItems: 1,
    resumen: [{ nombreProducto: "Termo", cantidad: 1 }],
    createdAt: "2026-09-01T12:00:00.000Z",
  };
}

function columna(extra = {}) {
  return {
    ordenes: [],
    total: 0,
    page: 1,
    cargando: false,
    error: null,
    errorPagina: null,
    cargandoPagina: false,
    ...extra,
  };
}

const onCargarMas = vi.fn();
const onReintentar = vi.fn();

function renderColumna(props = {}) {
  return render(
    <MemoryRouter>
      <DndContext>
        <ColumnaOrdenes
          estado={ESTADO}
          columna={columna()}
          onCargarMas={onCargarMas}
          onReintentar={onReintentar}
          resumenAbiertoId={null}
          onAlternarResumen={vi.fn()}
          {...props}
        />
      </DndContext>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  onCargarMas.mockReset();
  onReintentar.mockReset();
});

describe("ColumnaOrdenes — encabezado", () => {
  it("el contador sale del total del servidor, NO del largo de la página", () => {
    // Con 15 tarjetas cargadas de 140 entregadas, el encabezado tiene que
    // decir 140: si dijera 15, la columna estaría mintiendo sobre el volumen
    // real del negocio cada vez que hay más de una tanda.
    renderColumna({ columna: columna({ ordenes: [orden(1)], total: 140 }) });

    const encabezado = within(screen.getByRole("banner"));
    expect(encabezado.getByText("140")).toBeInTheDocument();
    expect(encabezado.getByText("Pendiente")).toBeInTheDocument();
  });

  it("se nombra a sí misma para un lector de pantalla", () => {
    renderColumna({ columna: columna({ total: 3 }) });

    expect(screen.getByRole("region", { name: "Pendiente: 3 órdenes" })).toBeInTheDocument();
  });
});

describe("ColumnaOrdenes — los cuatro estados de la carga", () => {
  it("mientras carga muestra el spinner y ningún mensaje de vacío", () => {
    renderColumna({ columna: columna({ cargando: true }) });

    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.queryByText("Sin órdenes acá.")).not.toBeInTheDocument();
  });

  it("distingue un error de una columna vacía, y ofrece reintentar", async () => {
    // Dibujar un error como "no hay órdenes" le diría al admin que no tiene
    // pedidos cuando lo que pasó es que se cayó la red.
    renderColumna({ columna: columna({ error: "500 del servidor" }) });

    expect(screen.getByText(/No se pudieron cargar estas órdenes/)).toBeInTheDocument();
    expect(screen.queryByText("Sin órdenes acá.")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onReintentar).toHaveBeenCalledWith("PENDIENTE");
  });

  it("una columna vacía lo dice, sin ofrecer reintento", () => {
    renderColumna();

    expect(screen.getByText("Sin órdenes acá.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeInTheDocument();
  });

  it("con datos, renderiza una tarjeta por orden", () => {
    renderColumna({ columna: columna({ ordenes: [orden(1), orden(2)], total: 2 }) });

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });
});

describe("ColumnaOrdenes — cargar más", () => {
  it("aparece solo cuando quedan órdenes sin traer", () => {
    renderColumna({ columna: columna({ ordenes: [orden(1)], total: 5 }) });

    expect(screen.getByRole("button", { name: "Cargar más" })).toBeInTheDocument();
  });

  it("desaparece cuando ya se trajo todo", () => {
    renderColumna({ columna: columna({ ordenes: [orden(1)], total: 1 }) });

    expect(screen.queryByRole("button", { name: "Cargar más" })).not.toBeInTheDocument();
  });

  it("un error de paginación NO borra lo que ya estaba cargado", async () => {
    renderColumna({
      columna: columna({ ordenes: [orden(1)], total: 5, errorPagina: "se cayó la red" }),
    });

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("se cayó la red")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(onCargarMas).toHaveBeenCalledWith("PENDIENTE");
  });
});
