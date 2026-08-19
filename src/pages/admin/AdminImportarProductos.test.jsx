import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminImportarProductos from "./AdminImportarProductos.jsx";

const descargarPlantillaMock = vi.fn();
const importarProductosMock = vi.fn();

vi.mock("../../api/importProductos.js", () => ({
  descargarPlantilla: (...args) => descargarPlantillaMock(...args),
  importarProductos: (...args) => importarProductosMock(...args),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AdminImportarProductos />
    </MemoryRouter>,
  );
}

function archivoXlsx() {
  return new File(["contenido"], "productos.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminImportarProductos", () => {
  it("muestra el estado inicial con los dos botones", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /descargar plantilla/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^importar$/i })).toBeInTheDocument();
  });

  it("avisa que los productos entran ocultos y sin fotos", () => {
    renderizar();

    expect(screen.getByText(/ocultos/i)).toBeInTheDocument();
    expect(screen.getByText(/fotos/i)).toBeInTheDocument();
  });

  it("deshabilita Importar mientras no haya archivo seleccionado", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /^importar$/i })).toBeDisabled();
  });

  it("descarga la plantilla al hacer click", async () => {
    descargarPlantillaMock.mockResolvedValue(undefined);
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: /descargar plantilla/i }));

    expect(descargarPlantillaMock).toHaveBeenCalled();
  });

  it("muestra la cantidad importada cuando sale bien", async () => {
    importarProductosMock.mockResolvedValue({ cantidad: 12 });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se importaron 12 productos/i)).toBeInTheDocument();
    });
  });

  it("renderiza la tabla de errores con fila, columna y motivo", async () => {
    const error = new Error("El archivo tiene errores. No se importó ningún producto.");
    error.errores = [
      { fila: 12, columna: "precio", valor: "abc", motivo: "El precio debe ser un número mayor a 0." },
      { fila: 23, columna: "categoria", valor: "Bazr", motivo: "La categoría no existe." },
    ];
    importarProductosMock.mockRejectedValue(error);
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no se importó ningún producto/i)).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("precio")).toBeInTheDocument();
    expect(screen.getByText(/el precio debe ser un número mayor a 0/i)).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText(/la categoría no existe/i)).toBeInTheDocument();
  });

  it("muestra un mensaje suelto cuando el error no trae lista de filas", async () => {
    importarProductosMock.mockRejectedValue(new Error("El archivo no tiene ninguna fila para importar."));
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no tiene ninguna fila para importar/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
