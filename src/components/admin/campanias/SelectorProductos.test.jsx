import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Guard del contrato del filtro de etiqueta de la vitrina, no del componente
 * entero: `SelectorProductos` ya tiene su propio doc-block con el resto de las
 * decisiones (una sola fuente de la lista, `PUT /:id/productos`, etc.).
 *
 * Lo que este archivo cubre es lo que cambió en esta tanda: el `<select>` de
 * etiqueta pasó de mandar el NOMBRE a mandar el ID. El modo de falla si esto
 * se rompe es MUDO — un id que no parsea a entero no arma filtro en el
 * backend y deja pasar el catálogo entero, sin error en ningún lado.
 */

const getCategoriasMock = vi.fn();
const getEtiquetasMock = vi.fn();
const getProductsMock = vi.fn();

vi.mock("../../../api/categorias.js", () => ({
  getCategorias: (...args) => getCategoriasMock(...args),
}));
vi.mock("../../../api/products.js", () => ({
  getEtiquetas: (...args) => getEtiquetasMock(...args),
  getProducts: (...args) => getProductsMock(...args),
}));
vi.mock("../../../api/promociones.js", () => ({
  getPromocion: vi.fn(),
}));

const { default: SelectorProductos } = await import("./SelectorProductos.jsx");

function montar() {
  return render(
    <SelectorProductos
      productos={[]}
      promocionesAsociadas={[]}
      guardando={false}
      onGuardar={vi.fn()}
    />,
  );
}

describe("SelectorProductos — filtro de etiqueta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoriasMock.mockResolvedValue([]);
    getProductsMock.mockResolvedValue({ data: [] });
  });

  it("el select de etiqueta se llena con el id como value y el nombre + conteo como label", async () => {
    getEtiquetasMock.mockResolvedValue({
      etiquetas: [
        { id: 2, nombre: "Exclusivo", cantidadProductos: 3 },
        { id: 5, nombre: "Nuevo", cantidadProductos: 0 },
      ],
    });

    montar();

    const select = await screen.findByLabelText(/filtrar por etiqueta/i);
    expect(within(select).getByRole("option", { name: "Exclusivo (3)" })).toHaveValue("2");
    expect(within(select).getByRole("option", { name: "Nuevo (0)" })).toHaveValue("5");
  });

  it("elegir una etiqueta manda el ID a getProducts, no el nombre", async () => {
    const user = userEvent.setup();
    getEtiquetasMock.mockResolvedValue({
      etiquetas: [{ id: 5, nombre: "Nuevo", cantidadProductos: 0 }],
    });

    montar();

    await user.selectOptions(await screen.findByLabelText(/filtrar por etiqueta/i), "5");

    await waitFor(() =>
      expect(getProductsMock).toHaveBeenCalledWith(expect.objectContaining({ etiqueta: "5" })),
    );
  });
});
