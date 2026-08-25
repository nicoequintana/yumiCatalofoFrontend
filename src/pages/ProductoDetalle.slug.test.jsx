import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";

const getProductByIdMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProductById: (...args) => getProductByIdMock(...args),
  registrarCompartido: vi.fn(),
  registrarFavorito: vi.fn(),
  registrarEvento: vi.fn(),
}));

const { default: ProductoDetalle } = await import("./ProductoDetalle.jsx");

// El brief de esta tarea omitía el `ToastProvider`: `ProductoDetalle` llama a
// `useToast()` incondicionalmente (redirección a producto no disponible), y
// ese hook tira si no hay provider en el árbol — mismo motivo por el que
// `ProductoDetalle.test.jsx` ya lo envuelve. Sin esto los tres tests de este
// archivo fallan por esa excepción, no por la lógica de parseo de la ruta.
function renderEn(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ToastProvider>
        <Routes>
          <Route path="/producto/:idSlug" element={<ProductoDetalle />} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getProductByIdMock.mockReset();
  getProductByIdMock.mockResolvedValue({
    id: 12, nombre: "Set de cuchillos", precio: "45000", stock: 3,
    fotos: [], caracteristicas: [], beneficios: [], usos: [], idealPara: [],
    incluye: [], especificaciones: [], categoria: null, video: null,
  });
});

describe("ProductoDetalle con slug en la ruta", () => {
  it("pide el producto por el id del prefijo, no por el slug entero", async () => {
    renderEn("/producto/12-set-de-cuchillos");

    await waitFor(() => expect(getProductByIdMock).toHaveBeenCalledWith(12));
  });

  it("sigue funcionando con el id pelado (links viejos)", async () => {
    renderEn("/producto/12");

    await waitFor(() => expect(getProductByIdMock).toHaveBeenCalledWith(12));
  });

  it("no llama a la API cuando el parámetro no tiene id", async () => {
    renderEn("/producto/set-de-cuchillos");

    await waitFor(() => expect(screen.getByText("home")).toBeInTheDocument());
    expect(getProductByIdMock).not.toHaveBeenCalled();
  });
});
