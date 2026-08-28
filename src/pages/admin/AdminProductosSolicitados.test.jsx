import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductosSolicitados from "./AdminProductosSolicitados.jsx";
import * as ordenesApi from "../../api/ordenes.js";

vi.mock("../../api/ordenes.js");

const MATE = {
  productId: 7,
  sku: "YIMA-MATE-1234",
  nombre: "Mate imperial",
  unidades: 5,
  ordenes: 2,
  facturacion: "45000",
};

function respuesta(data, historico = {}) {
  return {
    data,
    historico: { ordenesAnalizadas: data.length, tope: 20000, recortado: false, ...historico },
  };
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/ordenes/productos-solicitados"]}>
      <AdminProductosSolicitados />
    </MemoryRouter>,
  );
}

describe("AdminProductosSolicitados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([MATE]));
    ordenesApi.descargarProductosSolicitados.mockResolvedValue(undefined);
  });

  it("muestra la fila agrupada con SKU, unidades, ordenes y facturacion", async () => {
    renderPagina();

    expect(await screen.findByText("Mate imperial")).toBeInTheDocument();
    expect(screen.getByText("YIMA-MATE-1234")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$ 45.000")).toBeInTheDocument();
  });

  it("muestra un guion en el SKU del producto borrado", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(
      respuesta([{ ...MATE, productId: null, sku: null }]),
    );

    renderPagina();

    await screen.findByText("Mate imperial");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("distingue 'no hay nada' de 'fallo la carga'", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([]));

    renderPagina();

    expect(await screen.findByText("Todavía no hay productos solicitados")).toBeInTheDocument();
  });

  it("avisa cuando la carga falla, en vez de mostrar la pantalla vacia", async () => {
    ordenesApi.getProductosSolicitados.mockRejectedValue(new Error("caído"));

    renderPagina();

    expect(await screen.findByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay productos solicitados")).not.toBeInTheDocument();
  });

  it("descarga el Excel al apretar el boton", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Mate imperial");
    await user.click(screen.getByRole("button", { name: /descargar excel/i }));

    expect(ordenesApi.descargarProductosSolicitados).toHaveBeenCalledTimes(1);
  });

  it("no ofrece la descarga cuando no hay nada que exportar", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([]));

    renderPagina();

    await screen.findByText("Todavía no hay productos solicitados");
    expect(screen.queryByRole("button", { name: /descargar excel/i })).not.toBeInTheDocument();
  });

  it("avisa si la descarga falla, sin romper la grilla", async () => {
    const user = userEvent.setup();
    ordenesApi.descargarProductosSolicitados.mockRejectedValue(new Error("no se pudo"));

    renderPagina();
    await screen.findByText("Mate imperial");
    await user.click(screen.getByRole("button", { name: /descargar excel/i }));

    expect(await screen.findByText("no se pudo")).toBeInTheDocument();
    expect(screen.getByText("Mate imperial")).toBeInTheDocument();
  });

  it("declara que el historico quedo recortado", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(
      respuesta([MATE], { recortado: true, ordenesAnalizadas: 20000 }),
    );

    renderPagina();

    expect(await screen.findByTestId("aviso-historico")).toBeInTheDocument();
  });

  it("no muestra el aviso de recorte cuando entro todo", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    expect(screen.queryByTestId("aviso-historico")).not.toBeInTheDocument();
  });

  it("pide los datos una sola vez al montar", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    await waitFor(() => expect(ordenesApi.getProductosSolicitados).toHaveBeenCalledTimes(1));
  });
});

/**
 * La ruta vive bajo `/catalogo/admin/ordenes/`, que ya tiene un segmento
 * dinámico (`:id`, el detalle de orden). React Router resuelve por
 * especificidad y no por orden de declaración, así que el segmento literal
 * gana — pero de eso depende que la pantalla exista, y si alguna vez dejara de
 * cumplirse la falla sería un "orden no encontrada" en vez de la grilla.
 *
 * Los paths van literales, igual que en `App.jsx`: el repo no tiene un módulo
 * de rutas del que importarlos.
 */
describe("ruteo de /catalogo/admin/ordenes/productos-solicitados", () => {
  function renderRutas() {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/ordenes/productos-solicitados"]}>
        <Routes>
          <Route path="/catalogo/admin/ordenes/:id" element={<p>detalle de orden</p>} />
          <Route
            path="/catalogo/admin/ordenes/productos-solicitados"
            element={<p>grilla agrupada</p>}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("no queda tapada por el detalle de orden", () => {
    renderRutas();

    expect(screen.getByText("grilla agrupada")).toBeInTheDocument();
    expect(screen.queryByText("detalle de orden")).not.toBeInTheDocument();
  });
});
