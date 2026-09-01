import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminEmbudo from "./AdminEmbudo.jsx";
import * as adminEmbudoApi from "../../api/adminEmbudo.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/adminEmbudo.js");

/** Período dentro de la ventana confiable: todas las etapas registrando. */
const EMBUDO_CONFIABLE = {
  periodo: { desde: "2026-08-19", hasta: "2026-08-19", recortado: false },
  etapas: [
    {
      clave: "VISTAS",
      etiqueta: "Vistas",
      cantidad: 1000,
      registraDesde: "2026-08-19",
      subregistrada: false,
      tasaDesdeAnterior: null,
      tasaCalculable: false,
    },
    {
      clave: "CARRITO",
      etiqueta: "Carrito",
      cantidad: 200,
      registraDesde: "2026-08-18",
      subregistrada: false,
      tasaDesdeAnterior: 0.2,
      tasaCalculable: true,
    },
    {
      clave: "ORDENES_CREADAS",
      etiqueta: "Órdenes creadas",
      cantidad: 50,
      registraDesde: "2026-08-18",
      subregistrada: false,
      tasaDesdeAnterior: 0.25,
      tasaCalculable: true,
    },
    {
      clave: "ORDENES_CONFIRMADAS",
      etiqueta: "Órdenes confirmadas",
      cantidad: 25,
      registraDesde: "2026-08-18",
      subregistrada: false,
      tasaDesdeAnterior: 0.5,
      tasaCalculable: true,
    },
  ],
  tasaGlobal: 0.025,
  tasaGlobalCalculable: true,
  confiableDesde: "2026-08-19",
  periodoConfiable: true,
  fuentesTrafico: [
    { fuente: "Directo", cantidad: 620 },
    { fuente: "instagram.com", cantidad: 300 },
  ],
};

/** El caso real: emisores cableados en momentos distintos. */
const EMBUDO_NO_CONFIABLE = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  etapas: [
    {
      clave: "VISTAS",
      etiqueta: "Vistas",
      cantidad: 1,
      registraDesde: "2026-08-19",
      subregistrada: true,
      tasaDesdeAnterior: null,
      tasaCalculable: false,
    },
    {
      clave: "CARRITO",
      etiqueta: "Carrito",
      cantidad: 72,
      registraDesde: "2026-08-18",
      subregistrada: true,
      tasaDesdeAnterior: null,
      tasaCalculable: false,
    },
    {
      clave: "ORDENES_CREADAS",
      etiqueta: "Órdenes creadas",
      cantidad: 45,
      registraDesde: "2026-08-18",
      subregistrada: true,
      tasaDesdeAnterior: 0.625,
      tasaCalculable: true,
    },
    {
      clave: "ORDENES_CONFIRMADAS",
      etiqueta: "Órdenes confirmadas",
      cantidad: 10,
      registraDesde: "2026-08-18",
      subregistrada: true,
      tasaDesdeAnterior: 0.2222,
      tasaCalculable: true,
    },
  ],
  tasaGlobal: null,
  tasaGlobalCalculable: false,
  confiableDesde: "2026-08-19",
  periodoConfiable: false,
  fuentesTrafico: [{ fuente: "Directo", cantidad: 1 }],
};

const EMBUDO_VACIO = {
  periodo: { desde: "2026-07-21", hasta: "2026-08-19", recortado: false },
  etapas: [
    { clave: "VISTAS", etiqueta: "Vistas", cantidad: 0, registraDesde: null, subregistrada: true, tasaDesdeAnterior: null, tasaCalculable: false },
    { clave: "CARRITO", etiqueta: "Carrito", cantidad: 0, registraDesde: null, subregistrada: true, tasaDesdeAnterior: null, tasaCalculable: false },
    { clave: "ORDENES_CREADAS", etiqueta: "Órdenes creadas", cantidad: 0, registraDesde: null, subregistrada: true, tasaDesdeAnterior: null, tasaCalculable: false },
    { clave: "ORDENES_CONFIRMADAS", etiqueta: "Órdenes confirmadas", cantidad: 0, registraDesde: null, subregistrada: true, tasaDesdeAnterior: null, tasaCalculable: false },
  ],
  tasaGlobal: null,
  tasaGlobalCalculable: false,
  confiableDesde: null,
  periodoConfiable: false,
  fuentesTrafico: [],
};

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/embudo"]}>
      <AdminEmbudo />
    </MemoryRouter>,
  );
}

describe("AdminEmbudo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_CONFIABLE);
  });

  it("muestra loading y luego las cuatro etapas con sus conteos", async () => {
    renderPagina();

    expect(screen.getByText("Cargando embudo…")).toBeInTheDocument();

    const embudo = await screen.findByLabelText("Embudo de conversión");
    for (const etiqueta of ["Vistas", "Carrito", "Órdenes creadas", "Órdenes confirmadas"]) {
      expect(within(embudo).getByText(etiqueta)).toBeInTheDocument();
    }
    expect(within(embudo).getByText("1.000")).toBeInTheDocument();
    expect(within(embudo).getByText("200")).toBeInTheDocument();
    expect(within(embudo).getByText("50")).toBeInTheDocument();
    expect(within(embudo).getByText("25")).toBeInTheDocument();
  });

  it("renderiza el embudo sin librería de gráficos", async () => {
    renderPagina();

    expect(await screen.findByTestId("grafico-embudo")).toBeInTheDocument();
  });

  it("muestra las tasas entre etapas y la tasa global", async () => {
    renderPagina();

    const embudo = await screen.findByLabelText("Embudo de conversión");
    expect(within(embudo).getByText("20,0%")).toBeInTheDocument();
    expect(within(embudo).getByText("25,0%")).toBeInTheDocument();
    expect(within(embudo).getByText("50,0%")).toBeInTheDocument();

    expect(screen.getByTestId("tasa-global")).toHaveTextContent("2,5%");
  });

  it("no muestra la advertencia cuando el período es confiable", async () => {
    renderPagina();

    await screen.findByLabelText("Embudo de conversión");

    expect(screen.queryByTestId("advertencia-confiabilidad")).not.toBeInTheDocument();
  });

  it("muestra la advertencia de dato no confiable cuando el período no entra en la ventana", async () => {
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_NO_CONFIABLE);

    renderPagina();

    const advertencia = await screen.findByTestId("advertencia-confiabilidad");
    expect(advertencia).toHaveTextContent(/no son comparables/i);
    expect(advertencia).toHaveTextContent("19/08/2026");
  });

  it("la advertencia está antes del embudo, no al final de la página", async () => {
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_NO_CONFIABLE);

    renderPagina();

    const advertencia = await screen.findByTestId("advertencia-confiabilidad");
    const embudo = screen.getByLabelText("Embudo de conversión");

    expect(advertencia.compareDocumentPosition(embudo)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("nunca muestra un porcentaje mayor a 100%: la tasa no calculable se muestra como —", async () => {
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_NO_CONFIABLE);

    renderPagina();

    const embudo = await screen.findByLabelText("Embudo de conversión");

    // 72 sobre 1 vista sería 7200%: se muestra "—", no un número absurdo.
    expect(within(embudo).getAllByText("—").length).toBeGreaterThan(0);
    expect(within(embudo).queryByText(/7200/)).not.toBeInTheDocument();
    expect(embudo.textContent).not.toMatch(/[1-9]\d{2,},\d%/);

    expect(screen.getByTestId("tasa-global")).toHaveTextContent("—");
  });

  it("marca las etapas subregistradas para que no se lean como comparables", async () => {
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_NO_CONFIABLE);

    renderPagina();

    await screen.findByLabelText("Embudo de conversión");

    expect(screen.getAllByTestId("etapa-subregistrada").length).toBe(4);
  });

  it("muestra la tabla de fuentes de tráfico", async () => {
    renderPagina();

    const fuentes = await screen.findByLabelText("Fuentes de tráfico");
    expect(within(fuentes).getByText("instagram.com")).toBeInTheDocument();
    expect(within(fuentes).getByText("Directo")).toBeInTheDocument();
    expect(within(fuentes).getByText("620")).toBeInTheDocument();
  });

  it("la tabla de fuentes de tráfico está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    const seccion = await screen.findByLabelText("Fuentes de tráfico");
    esperarTablaApilada(within(seccion).getByRole("table"));
  });

  it("el selector de período dispara un refetch con nuevas fechas", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByLabelText("Embudo de conversión");
    vi.clearAllMocks();
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_CONFIABLE);

    await user.click(screen.getByRole("button", { name: /7 días/i }));

    await waitFor(() => {
      expect(adminEmbudoApi.getEmbudoConversion).toHaveBeenCalledWith(
        expect.objectContaining({
          desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          hasta: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        }),
      );
    });
  });

  it("muestra estado vacío cuando no hubo actividad en el período", async () => {
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(EMBUDO_VACIO);

    renderPagina();

    expect(await screen.findByText("No hubo actividad en este período")).toBeInTheDocument();
  });

  it("no muestra el aviso de período recortado cuando no hubo recorte", async () => {
    renderPagina();

    await screen.findByTestId("grafico-embudo");

    expect(screen.queryByTestId("advertencia-periodo-recortado")).not.toBeInTheDocument();
  });

  it("avisa cuando el backend recortó el período pedido", async () => {
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue({
      ...EMBUDO_CONFIABLE,
      periodo: { desde: "2025-07-17", hasta: "2026-08-19", recortado: true },
    });

    renderPagina();

    const aviso = await screen.findByTestId("advertencia-periodo-recortado");
    expect(within(aviso).getByText(/supera el máximo/i)).toBeInTheDocument();
    expect(within(aviso).getByText(/17\/07\/2025/)).toBeInTheDocument();
  });

  it("no rompe si la respuesta no trae `periodo` (backend viejo)", async () => {
    const { periodo, ...sinPeriodo } = EMBUDO_CONFIABLE;
    expect(periodo).toBeDefined();
    adminEmbudoApi.getEmbudoConversion.mockResolvedValue(sinPeriodo);

    renderPagina();

    await screen.findByTestId("grafico-embudo");

    expect(screen.queryByTestId("advertencia-periodo-recortado")).not.toBeInTheDocument();
  });

  it("muestra un mensaje de error si la carga falla", async () => {
    adminEmbudoApi.getEmbudoConversion.mockRejectedValue(new Error("No autorizado."));

    renderPagina();

    expect(await screen.findByText("No autorizado.")).toBeInTheDocument();
  });
});
