import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import CatalogoCombos from "./CatalogoCombos.jsx";

const combosCatalogoMock = vi.fn();
vi.mock("../hooks/useCombosCatalogo.js", () => ({ default: () => combosCatalogoMock() }));
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
});
