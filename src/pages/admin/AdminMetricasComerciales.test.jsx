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
  tope: 50,
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
    // `formatFecha`, no el ISO crudo: es el mismo formato que ya usa el
    // período de cada tarjeta, dos líneas más abajo en el mismo componente.
    expect(chip).toHaveAttribute("title", expect.stringContaining("08/09/2026"));
  });

  // `registraDesde: null` es el estado de producción hoy: cero eventos
  // comerciales todavía, así que TODAS las tarjetas salen subregistradas.
  // "La medición empezó el —" sería un dato fantasma; el título tiene que
  // decir que nunca hubo registro, no fingir una fecha que no existe.
  it("con registraDesde null, el chip Parcial no inventa una fecha", async () => {
    getMetricasComercialesMock.mockResolvedValue({ ...RESPUESTA, registraDesde: null });

    montar();

    const chip = await screen.findByText("Parcial");
    expect(chip).toHaveAttribute("title", "Todavía no se registró ningún evento comercial");
    expect(chip).not.toHaveAttribute("title", expect.stringContaining("—"));
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

  it("avisa cuando el listado viene recortado, con el tope que manda el backend", async () => {
    getMetricasComercialesMock.mockResolvedValue({ ...RESPUESTA, truncado: true, tope: 50 });

    montar();

    expect(await screen.findByText(/recortad/i)).toBeInTheDocument();
    // El tope sale del sobre (`datos.tope`), nunca escrito a mano en la
    // pantalla — es el mismo número que el backend usa en el `take`.
    expect(screen.getByText(/50 campañas/)).toBeInTheDocument();
    expect(screen.getByText(/50 promociones/)).toBeInTheDocument();
  });

  it("declara el rango sobre el que se contaron las etapas", async () => {
    montar();
    await screen.findByText("Primavera");

    // `formatFecha`, no el ISO crudo — mismo motivo que el chip Parcial.
    // Acotado a la nota (`role="status"`) porque el período de la tarjeta
    // termina la misma fecha en este fixture y también la muestra.
    expect(screen.getByRole("status")).toHaveTextContent("16/09/2026");
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

  it("con un filtro activo y cero resultados, el vacío dice que el filtro no encontró nada", async () => {
    const usuario = userEvent.setup();
    montar();
    await screen.findByText("Primavera");

    // La próxima llamada (la que dispara el click) vuelve vacía; el mount ya
    // consumió el default de `beforeEach`. Sin esta distinción, "Todavía no
    // hay actividad" sería falso: la actividad existe, el filtro no la
    // alcanza.
    getMetricasComercialesMock.mockResolvedValueOnce({ ...RESPUESTA, items: [] });
    await usuario.click(screen.getByRole("button", { name: "Finalizadas" }));

    expect(await screen.findByText(/sin resultados/i)).toBeInTheDocument();
    expect(screen.queryByText(/todavía no/i)).not.toBeInTheDocument();
  });
});
