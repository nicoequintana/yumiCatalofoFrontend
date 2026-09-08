import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

const getMetricasComercialesMock = vi.fn();
vi.mock("../../api/adminMetricasComerciales.js", () => ({
  getMetricasComerciales: (...args) => getMetricasComercialesMock(...args),
}));

const { default: AdminMetricasComerciales } = await import("./AdminMetricasComerciales.jsx");

const RESPUESTA = {
  registraDesde: "2026-09-08",
  truncado: false,
  etapasEnRango: { desde: "2026-09-06", hasta: "2026-09-16" },
  origenes: [
    { valor: "MODAL", etiqueta: "Cartel" },
    { valor: "BANNER", etiqueta: "Slide del carrusel" },
  ],
  items: [
    {
      tipo: "CAMPANIA",
      id: 7,
      nombre: "Primavera",
      estado: "HABILITADA",
      estadoTemporal: "ACTIVA",
      periodo: { desde: "2026-09-06", hasta: "2026-09-16" },
      subregistrada: true,
      impresiones: { MODAL: 100, BANNER: 40 },
      clicks: { MODAL: 25, BANNER: 0 },
      tasaClicks: { MODAL: 0.25, BANNER: null },
      clicksPorDestino: [
        { destino: "CAMPANIA", etiqueta: "Los productos de la campaña", clicks: 25 },
      ],
      etapas: [
        { clave: "VISTAS", etiqueta: "Vistas de producto", cantidad: 1234 },
        { clave: "CARRITO", etiqueta: "Agregados al carrito", cantidad: 56 },
      ],
    },
  ],
};

function montar() {
  return render(
    <MemoryRouter>
      <AdminMetricasComerciales />
    </MemoryRouter>,
  );
}

describe("AdminMetricasComerciales", () => {
  beforeEach(() => {
    getMetricasComercialesMock.mockReset();
    getMetricasComercialesMock.mockResolvedValue(RESPUESTA);
  });

  it("la tabla de cada tarjeta cumple el contrato de tabla apilada", async () => {
    const { container } = montar();
    await screen.findByText("Primavera");

    esperarTablaApilada(container.querySelector("table"));
  });

  it("una tasa null se muestra como guion, nunca como cero", async () => {
    montar();
    const tabla = await screen.findByRole("table");

    const filaBanner = within(tabla).getByText("Slide del carrusel").closest("tr");
    expect(within(filaBanner).getByText("—")).toBeInTheDocument();
    expect(within(filaBanner).queryByText("0 %")).not.toBeInTheDocument();
  });

  it("los rótulos de las filas salen del backend, no de literales", async () => {
    getMetricasComercialesMock.mockResolvedValue({
      ...RESPUESTA,
      origenes: [{ valor: "MODAL", etiqueta: "Rótulo inventado" }],
    });

    montar();

    expect(await screen.findByText("Rótulo inventado")).toBeInTheDocument();
  });

  it("un ítem subregistrado muestra el chip Parcial con su fecha", async () => {
    montar();

    const chip = await screen.findByText("Parcial");
    expect(chip).toHaveAttribute("title", expect.stringContaining("2026-09-08"));
  });

  it("emite el estado administrativo, que distingue 'nadie la vio' de 'nunca salió'", async () => {
    montar();

    expect(await screen.findByText(/HABILITADA/i)).toBeInTheDocument();
  });

  it("el filtro por estado se manda al backend y vuelve a la lista completa", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Primavera");

    await usuario.click(screen.getByRole("button", { name: "Activas" }));
    expect(getMetricasComercialesMock).toHaveBeenLastCalledWith({ estado: "ACTIVA" });

    await usuario.click(screen.getByRole("button", { name: "Todas" }));
    expect(getMetricasComercialesMock).toHaveBeenLastCalledWith({ estado: undefined });
  });

  it("el grupo de filtros es un group con aria-pressed, no un tablist", async () => {
    montar();
    await screen.findByText("Primavera");

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "true");
  });

  it("avisa cuando el listado viene recortado", async () => {
    getMetricasComercialesMock.mockResolvedValue({ ...RESPUESTA, truncado: true });

    montar();

    expect(await screen.findByText(/recortad/i)).toBeInTheDocument();
  });

  it("declara el rango sobre el que se contaron las etapas", async () => {
    montar();

    expect(await screen.findByText(/2026-09-16/)).toBeInTheDocument();
  });

  it("un error muestra el estado de error, y un reintento exitoso lo limpia", async () => {
    const usuario = userEvent.setup();
    getMetricasComercialesMock.mockRejectedValueOnce(new Error("sin red"));

    montar();

    const reintentar = await screen.findByRole("button", { name: /reintentar/i });
    getMetricasComercialesMock.mockResolvedValue(RESPUESTA);
    await usuario.click(reintentar);

    expect(await screen.findByText("Primavera")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reintentar/i })).not.toBeInTheDocument();
  });

  it("sin ítems muestra el estado vacío, no una lista en blanco", async () => {
    getMetricasComercialesMock.mockResolvedValue({ ...RESPUESTA, items: [] });

    montar();

    expect(await screen.findByText(/todavía no/i)).toBeInTheDocument();
  });
});
