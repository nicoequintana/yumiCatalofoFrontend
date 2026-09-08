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

/**
 * Área táctil de los controles de la vitrina.
 *
 * ⚠️ **Esta pantalla se le escapó ENTERA al barrido de la auditoría original.**
 * El editor de campaña es una RUTA propia (`/catalogo/admin/campanias/:id/editar`)
 * a la que "Nueva campaña" NAVEGA, así que el recorrido de
 * `/catalogo/admin/campanias` nunca llegaba hasta acá. Y estas secciones solo
 * existen en modo EDICIÓN: la ruta de alta (`/campanias/nueva`) no las renderiza
 * y mide limpio.
 *
 * Medido en navegador el 07/09/2026 a 1280×800 sobre
 * `/catalogo/admin/campanias/1054/editar`, con `elementFromPoint` —el área
 * EFECTIVA, no la caja declarada—: los "Agregar" de fila daban 92×33, los
 * "Quitar" 77×33 y el "Agregar los N resultados" 34 de alto. El ancho ya sobra
 * en todos; lo que faltaba era el ALTO, contra el mínimo de 44 de WCAG 2.5.8.
 *
 * Se usa `min-h-11` y no el pseudo-elemento de `AREA_TACTIL` porque son botones
 * de FILA dentro de una lista `overflow-y-auto`: un pseudo que sobresalga queda
 * recortado en la primera y la última fila, en silencio.
 *
 * jsdom no hace layout, así que acá se afirma sobre la CLASE declarada. La
 * medición real es en navegador.
 */
describe("SelectorProductos — área táctil (44px)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoriasMock.mockResolvedValue([]);
    getEtiquetasMock.mockResolvedValue({ etiquetas: [] });
    getProductsMock.mockResolvedValue({
      data: [
        { id: 7, nombre: "Silla Nórdica", sku: "SKU-7", fotos: [], visibleEnCatalogo: true },
        { id: 8, nombre: "Mesa Ratona", sku: "SKU-8", fotos: [], visibleEnCatalogo: true },
      ],
    });
  });

  function montarConVitrina() {
    return render(
      <SelectorProductos
        productos={[
          { id: 1, nombre: "Bandeja de Roble", sku: "SKU-1", fotoPortada: null, visibleEnCatalogo: true },
        ]}
        promocionesAsociadas={[{ id: 9, nombre: "Invierno" }]}
        guardando={false}
        onGuardar={vi.fn()}
      />,
    );
  }

  it.each([
    ["Agregar los 2 resultados", /agregar los 2 resultados/i],
    ["Agregar de fila", "Agregar Silla Nórdica"],
    ["Quitar de fila", "Quitar Bandeja de Roble"],
    ["Traer los de las promociones", /traer los de las promociones/i],
  ])("«%s» declara el mínimo táctil de 44px de alto", async (_, nombre) => {
    montarConVitrina();

    const boton = await screen.findByRole("button", { name: nombre });
    expect(boton.className.split(" ")).toContain("min-h-11");
  });
});
