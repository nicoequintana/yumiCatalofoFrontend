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

  it("nombra las cinco columnas del archivo", () => {
    renderizar();

    expect(screen.getAllByText(/sku/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.getByText(/^costo$/i)).toBeInTheDocument();
    expect(screen.getByText(/^coeficiente$/i)).toBeInTheDocument();
    expect(screen.getByText(/^stock$/i)).toBeInTheDocument();
    // `precio` salió del archivo: se deriva del costo.
    expect(screen.queryByText(/^precio$/i)).not.toBeInTheDocument();
  });

  // El aviso importa más que el resto del copy: es lo único que le dice al
  // admin que subir este archivo NO le vacía la descripción ni el contenido
  // comercial de todo el catálogo, que es lo que haría la versión anterior de
  // `dataDeActualizacion` con una planilla de cuatro columnas.
  it("aclara que solo se tocan nombre, costeo y stock", () => {
    renderizar();

    expect(
      screen.getByText(/solo se modifican nombre, costo, coeficiente y stock/i),
    ).toBeInTheDocument();
  });

  // Sin esta línea, quien sube la planilla se queda esperando que los precios
  // cambien solos. Cambian recién al aplicarlos.
  it("avisa que el precio no se publica con la subida", () => {
    renderizar();

    expect(screen.getByText(/El precio de venta no se sube por acá/i)).toBeInTheDocument();
    expect(screen.getByText(/queda[n]? en «Difiere»/i)).toBeInTheDocument();
  });

  it("manda a la pantalla de importación para dar de alta productos nuevos", () => {
    renderizar();

    expect(screen.getByRole("link", { name: /importar productos/i })).toHaveAttribute(
      "href",
      "/catalogo/admin/productos/importar",
    );
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

  it("muestra la cantidad actualizada", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ actualizados: 7, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se actualizaron 7 productos/i)).toBeInTheDocument();
    });
    // Este flujo dejó de crear productos el 25/08/2026.
    expect(screen.queryByText(/se crearon/i)).not.toBeInTheDocument();
  });

  it("usa el singular cuando actualizó un solo producto", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ actualizados: 1, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se actualizó 1 producto\./i)).toBeInTheDocument();
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
