import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminActualizarProductos from "./AdminActualizarProductos.jsx";

const exportarProductosMock = vi.fn();
const actualizarProductosMasivoMock = vi.fn();

vi.mock("../../api/importProductos.js", () => ({
  exportarProductos: (...args) => exportarProductosMock(...args),
  actualizarProductosMasivo: (...args) => actualizarProductosMasivoMock(...args),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AdminActualizarProductos />
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

describe("AdminActualizarProductos", () => {
  it("muestra el estado inicial con los dos botones", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /exportar catálogo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^actualizar$/i })).toBeInTheDocument();
  });

  it("avisa que actualiza por SKU y no toca fotos, video ni visibilidad", () => {
    renderizar();

    expect(screen.getAllByText(/sku/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/fotos, video o visibilidad/i)).toBeInTheDocument();
  });

  it("deshabilita Actualizar mientras no haya archivo seleccionado", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /^actualizar$/i })).toBeDisabled();
  });

  it("exporta el catálogo al hacer click", async () => {
    exportarProductosMock.mockResolvedValue(undefined);
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: /exportar catálogo/i }));

    expect(exportarProductosMock).toHaveBeenCalled();
  });

  it("muestra solo la cantidad actualizada cuando no hubo altas", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ creados: 0, actualizados: 7, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se actualizaron 7 productos/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/se crearon/i)).not.toBeInTheDocument();
  });

  it("muestra solo la cantidad creada cuando no hubo actualizaciones", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ creados: 3, actualizados: 0, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se crearon 3 productos nuevos/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/se actualizaron/i)).not.toBeInTheDocument();
  });

  it("muestra creados y actualizados juntos cuando el lote trae los dos", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ creados: 2, actualizados: 5, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se crearon 2 productos nuevos y se actualizaron 5/i)).toBeInTheDocument();
    });
  });

  it("renderiza la tabla de errores con fila, columna y motivo", async () => {
    const error = new Error("El archivo tiene errores. No se guardó ningún producto.");
    error.errores = [
      { fila: 12, columna: "sku", valor: "NOEXISTE", motivo: "No existe ningún producto con este SKU." },
      { fila: 23, columna: "precio", valor: "abc", motivo: "El precio debe ser un número mayor a 0." },
    ];
    actualizarProductosMasivoMock.mockRejectedValue(error);
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no se guardó ningún producto/i)).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("sku")).toBeInTheDocument();
    expect(screen.getByText(/no existe ningún producto con este sku/i)).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("muestra un mensaje suelto cuando el error no trae lista de filas", async () => {
    actualizarProductosMasivoMock.mockRejectedValue(
      new Error("El archivo no tiene ninguna fila para actualizar o crear."),
    );
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no tiene ninguna fila para actualizar/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
