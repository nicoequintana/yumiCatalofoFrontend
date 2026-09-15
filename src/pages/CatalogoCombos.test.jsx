import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import CatalogoCombos from "./CatalogoCombos.jsx";

const combosCatalogoMock = vi.fn();
vi.mock("../hooks/useCombosCatalogo.js", () => ({ default: () => combosCatalogoMock() }));
const resumenMock = vi.fn(() => ({ resumen: { cantidad: 3, porcentajeMaximo: 25 } }));
vi.mock("../hooks/useResumenCombos.js", () => ({ default: () => resumenMock() }));
vi.mock("../hooks/useCarrito.js", () => ({ default: () => ({ agregar: vi.fn() }) }));

function renderizar() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CatalogoCombos />
      </ToastProvider>
    </MemoryRouter>,
  );
}

function combo(id) {
  return {
    id, ruta: `/combos/${id}`, nombre: `Kit ${id}`, frase: "Frase.", porcentaje: 10,
    precioSeparado: "10000", precioCombo: "9000", ahorro: "1000", unidades: 2, alcanza: 5,
    disponible: true, quedanPocos: false, heroUrl: null,
    items: [{ productId: 1, nombre: "A", cantidad: 1, precioLista: "5000", foto: null, ruta: "/producto/1", categoria: null }],
  };
}

describe("CatalogoCombos", () => {
  it("con combos, muestra la grilla doble", () => {
    combosCatalogoMock.mockReturnValue({ combos: [combo(1), combo(2)], cargando: false, error: null });
    renderizar();
    expect(screen.getAllByRole("link", { name: /Ver el combo/i })).toHaveLength(2);
  });

  it("encabezado: eyebrow, h1 y la promesa, con los dos números que manda el backend", () => {
    combosCatalogoMock.mockReturnValue({ combos: [combo(1), combo(2), combo(3)], cargando: false, error: null });
    renderizar();
    expect(screen.getByRole("heading", { level: 1, name: "Llevá el set completo y pagá menos" })).toBeInTheDocument();
    expect(screen.getByText("Productos elegidos para usarse juntos, con un descuento que solo tenés comprando el combo.")).toBeInTheDocument();
    expect(screen.getByText("Hasta 25% off")).toBeInTheDocument();
    expect(screen.getByText("3 combos disponibles")).toBeInTheDocument();
  });

  it("encabezado: con un solo combo dice 1 combo disponible", () => {
    resumenMock.mockReturnValueOnce({ resumen: { cantidad: 1, porcentajeMaximo: 10 } });
    combosCatalogoMock.mockReturnValue({ combos: [combo(1)], cargando: false, error: null });
    renderizar();
    expect(screen.getByText("1 combo disponible")).toBeInTheDocument();
  });

  it("si el resumen falla, el encabezado sale igual pero sin la línea de datos", () => {
    resumenMock.mockReturnValueOnce({ resumen: null });
    combosCatalogoMock.mockReturnValue({ combos: [combo(1)], cargando: false, error: null });
    renderizar();
    expect(screen.getByRole("heading", { level: 1, name: "Llevá el set completo y pagá menos" })).toBeInTheDocument();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    expect(screen.queryByText(/disponible/)).not.toBeInTheDocument();
  });

  it("si falló la lista de combos, el encabezado no afirma cuántos hay aunque el resumen haya llegado", () => {
    combosCatalogoMock.mockReturnValue({ combos: [], cargando: false, error: "Revisá tu conexión e intentá de nuevo." });
    renderizar();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText(/combos disponibles/)).not.toBeInTheDocument();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
  });

  it("con cantidad 0 no muestra la línea de datos", () => {
    resumenMock.mockReturnValueOnce({ resumen: { cantidad: 0, porcentajeMaximo: null } });
    combosCatalogoMock.mockReturnValue({ combos: [], cargando: false, error: null });
    renderizar();
    expect(screen.queryByText(/% off/)).not.toBeInTheDocument();
    expect(screen.getByText(/Muy pronto los vas a ver acá/)).toBeInTheDocument();
  });

  it("la grilla es de filas iguales y centra la última card impar (clase grilla-combos)", () => {
    combosCatalogoMock.mockReturnValue({ combos: [combo(1), combo(2), combo(3)], cargando: false, error: null });
    renderizar();
    const grilla = screen.getAllByRole("article")[0].closest(".grilla-combos");
    expect(grilla).not.toBeNull();
    expect(grilla).toHaveClass("auto-rows-fr", "md:grid-cols-2");
  });

  it("vacío: el mensaje de 'muy pronto' y el botón a /coleccion", () => {
    combosCatalogoMock.mockReturnValue({ combos: [], cargando: false, error: null });
    renderizar();
    expect(screen.getByText(/Muy pronto los vas a ver acá/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Mientras tanto, mirá los productos/i })).toHaveAttribute("href", "/coleccion");
  });

  it("error: EstadoVacio con cloud_off, NUNCA el mensaje de vacío", () => {
    combosCatalogoMock.mockReturnValue({ combos: [], cargando: false, error: "Revisá tu conexión e intentá de nuevo." });
    renderizar();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText(/Muy pronto/)).not.toBeInTheDocument();
  });

  it("cargando: no muestra ni el mensaje de vacío ni el de error", () => {
    combosCatalogoMock.mockReturnValue({ combos: [], cargando: true, error: null });
    renderizar();
    expect(screen.queryByText(/Muy pronto/)).not.toBeInTheDocument();
    expect(screen.queryByText("Revisá tu conexión e intentá de nuevo.")).not.toBeInTheDocument();
  });

  it("muestra las migas Inicio › Combos", () => {
    combosCatalogoMock.mockReturnValue({ combos: [combo(1)], cargando: false, error: null });
    renderizar();

    const nav = screen.getByRole("navigation", { name: "Miga de pan" });
    expect(within(nav).getByRole("link", { name: "Inicio" })).toHaveAttribute("href", "/");
    expect(within(nav).getByText("Combos")).toHaveAttribute("aria-current", "page");
  });
});
