import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminPromociones from "./AdminPromociones.jsx";
import * as promocionesApi from "../../api/promociones.js";
import * as categoriasApi from "../../api/categorias.js";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/promociones.js");
vi.mock("../../api/categorias.js");
vi.mock("../../api/products.js");

/**
 * Sobre de página del listado comercial. Los tests declaran las filas y el
 * helper arma `{ data, page, pageSize, total }` alrededor, mismo patrón que
 * `AdminProductos.test.jsx`.
 */
function listado(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 20, total: filas.length, ...extra };
}

const FILA = {
  id: 21,
  sku: "YIMA-1",
  nombre: "Velador LED",
  categoria: { id: 1, nombre: "Hogar" },
  fotoPortada: null,
  visibleEnCatalogo: true,
  stock: 4,
  vistas: 120,
  unidadesVendidas: 2,
  conversion: 1.6,
  costo: "8000",
  coeficiente: "2.50",
  precio: "20000",
  promociones: [],
};

function renderPagina(initial = "/") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminPromociones />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  promocionesApi.getPromociones.mockResolvedValue([]);
  promocionesApi.getListadoComercial.mockResolvedValue(listado([FILA]));
  promocionesApi.getConflictos.mockResolvedValue([]);
  categoriasApi.getCategorias.mockResolvedValue([
    { id: 1, nombre: "Hogar" },
    { id: 3, nombre: "Cocina" },
  ]);
  productsApi.getEtiquetas.mockResolvedValue({
    etiquetas: [
      { id: 2, nombre: "Nuevo", cantidadProductos: 4 },
      { id: 5, nombre: "Oferta", cantidadProductos: 2 },
    ],
  });
});

describe("AdminPromociones — filtros de categoría y etiqueta", () => {
  it("carga las opciones de categoría y etiqueta al montar, con el conteo en la etiqueta", async () => {
    renderPagina();

    const selectCategoria = await screen.findByLabelText("Categoría");
    expect(within(selectCategoria).getByRole("option", { name: "Hogar" })).toBeInTheDocument();
    expect(within(selectCategoria).getByRole("option", { name: "Cocina" })).toBeInTheDocument();

    const selectEtiqueta = screen.getByLabelText("Etiqueta");
    expect(within(selectEtiqueta).getByRole("option", { name: "Oferta (2)" })).toBeInTheDocument();
    expect(within(selectEtiqueta).getByRole("option", { name: "Nuevo (4)" })).toBeInTheDocument();
  });

  it("filtrar por categoría manda el id al backend y vuelve a la página 1", async () => {
    const user = userEvent.setup();
    renderPagina("/?page=2");
    await screen.findByText("Velador LED");

    await user.selectOptions(await screen.findByLabelText("Categoría"), "3");

    await waitFor(() => {
      expect(promocionesApi.getListadoComercial).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoria: "3", page: 1 }),
      );
    });
  });

  it("filtrar por etiqueta manda el id al backend", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Velador LED");

    await user.selectOptions(await screen.findByLabelText("Etiqueta"), "5");

    await waitFor(() => {
      expect(promocionesApi.getListadoComercial).toHaveBeenLastCalledWith(
        expect.objectContaining({ etiqueta: "5" }),
      );
    });
  });

  it("cambiar un filtro limpia la selección de checkboxes", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Velador LED");

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Velador LED" });
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.selectOptions(await screen.findByLabelText("Categoría"), "1");

    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Seleccionar Velador LED" })).not.toBeChecked(),
    );
  });

  it("los filtros viven en la URL: entrar con ?categoria= precarga el select y pide ese filtro", async () => {
    renderPagina("/?categoria=3");
    await screen.findByText("Velador LED");

    expect(screen.getByLabelText("Categoría")).toHaveValue("3");
    await waitFor(() => {
      expect(promocionesApi.getListadoComercial).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "3" }),
      );
    });
  });

  it("un fallo al traer categorías o etiquetas no rompe la pantalla (fallo blando a [])", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("network"));
    productsApi.getEtiquetas.mockRejectedValue(new Error("network"));

    renderPagina();

    const selectCategoria = await screen.findByLabelText("Categoría");
    // Solo queda la opción "Todas": filtrar sigue siendo posible por URL, y la
    // tabla de abajo —lo que esta pantalla existe para mostrar— no se entera.
    expect(within(selectCategoria).getAllByRole("option")).toHaveLength(1);
  });

  it("NO hay ordenamiento: la pantalla sigue diciendo que está ordenada por vistas", async () => {
    renderPagina();
    await screen.findByText("Velador LED");

    expect(
      screen.getByText("Qué se mira, qué se vende y a qué precio. Ordenado por vistas."),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/ordenar por/i)).not.toBeInTheDocument();
  });
});

describe("AdminPromociones — estado de error de carga", () => {
  it("no filtra el mensaje crudo del sistema: muestra el copy compartido con cloud_off", async () => {
    promocionesApi.getPromociones.mockRejectedValue(new Error("Error interno"));

    renderPagina();

    expect(await screen.findByText("No se pudieron cargar las promociones")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.queryByText("Error interno")).not.toBeInTheDocument();
  });

  it("con la carga caída no muestra además el estado vacío de promociones", async () => {
    promocionesApi.getPromociones.mockRejectedValue(new Error("Error interno"));

    renderPagina();

    await screen.findByText("No se pudieron cargar las promociones");
    expect(screen.queryByText("Todavía no hay promociones")).not.toBeInTheDocument();
  });

  it("Reintentar vuelve a pedir, y el fetch exitoso limpia el error", async () => {
    const user = userEvent.setup();
    promocionesApi.getPromociones.mockRejectedValueOnce(new Error("Error interno"));

    renderPagina();

    await screen.findByText("No se pudieron cargar las promociones");
    await user.click(screen.getByRole("button", { name: /Reintentar/i }));

    expect(await screen.findByText("Velador LED")).toBeInTheDocument();
    expect(screen.queryByText("No se pudieron cargar las promociones")).not.toBeInTheDocument();
  });
});

/**
 * Auditoría de área táctil del 07/09/2026, medida en navegador real con
 * `elementFromPoint` (área EFECTIVA, no la caja declarada) a 1280×800 —esta
 * pantalla es SOLO ESCRITORIO, así que 390×844 no la renderiza—:
 *
 * - "Crear" y "Agregar a una promoción" (la misma clase, ×2): 93×42;
 * - "Anterior" y "Siguiente" (la misma clase, ×2): 93×36;
 * - el nombre de la promoción, que abre el editor: 85×26;
 * - "Archivar": 93×33 · "Eliminar": 91×33.
 *
 * Dos herramientas distintas, por el motivo que documenta `utils/areaTactil.js`:
 * los botones que pueden crecer llevan `min-h-11` ADEMÁS de su padding, y el
 * nombre —texto en línea dentro de una celda— lleva el pseudo-elemento, que
 * estira el área sin mover el renglón.
 *
 * jsdom no calcula layout: se afirma sobre las CLASES declaradas.
 */
describe("AdminPromociones — área táctil", () => {
  const PROMOCION = {
    id: 7,
    nombre: "test promo",
    cantidadProductos: 2,
    activa: true,
    programada: false,
  };

  it("«Crear» y «Agregar a una promoción» declaran el piso de 44 de alto", async () => {
    renderPagina();
    await screen.findByText("Velador LED");

    for (const nombre of [/^crear$/i, /agregar a una promoción/i]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" "), boton.textContent).toContain("min-h-11");
    }
  });

  it("«Anterior» y «Siguiente» declaran el piso de 44 de alto", async () => {
    promocionesApi.getListadoComercial.mockResolvedValue(listado([FILA], { total: 40 }));
    renderPagina();
    await screen.findByText("Velador LED");

    for (const nombre of [/anterior/i, /siguiente/i]) {
      const boton = await screen.findByRole("button", { name: nombre });
      expect(boton.className.split(" "), boton.textContent).toContain("min-h-11");
    }
  });

  it("«Archivar» y «Eliminar» declaran el piso de 44 de alto", async () => {
    promocionesApi.getPromociones.mockResolvedValue([PROMOCION]);
    renderPagina();
    await screen.findByText("test promo");

    for (const nombre of [/archivar/i, /^eliminar$/i]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" "), boton.textContent).toContain("min-h-11");
    }
  });

  it("la confirmación de borrado también llega a 44 de alto", async () => {
    // «Sí, eliminar» y «No» comparten el molde de 32px de sus hermanos y no
    // aparecían en la medición porque el estado de confirmación estaba
    // cerrado. Están igual de por debajo del mínimo.
    const user = userEvent.setup();
    promocionesApi.getPromociones.mockResolvedValue([PROMOCION]);
    renderPagina();
    await screen.findByText("test promo");

    await user.click(screen.getByRole("button", { name: /^eliminar$/i }));

    for (const nombre of [/sí, eliminar/i, /^no$/i]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" "), boton.textContent).toContain("min-h-11");
    }
  });

  it("el nombre de la promoción extiende su área sin cambiar el renglón", async () => {
    promocionesApi.getPromociones.mockResolvedValue([PROMOCION]);
    renderPagina();

    const nombre = await screen.findByRole("button", { name: "test promo" });
    // El pseudo-elemento necesita un ancestro posicionado y un `content`, o no
    // se pinta ninguna caja y el área táctil sigue siendo la de siempre.
    expect(nombre.className).toContain("relative");
    expect(nombre.className).toContain("before:content-['']");
    expect(nombre.className).toContain("before:h-11");
    // Ancho propio, no 44: el texto ya sobra de ancho y una caja fija le
    // robaría área a lo que tenga al lado.
    expect(nombre.className).toContain("before:w-full");
  });

  it("el botón de cerrar el editor extiende su área a 44×44", async () => {
    // Ícono suelto de 20px con `p-1`: 28×28 de caja. No entró en la medición
    // porque el editor estaba cerrado.
    const user = userEvent.setup();
    promocionesApi.getPromociones.mockResolvedValue([PROMOCION]);
    promocionesApi.getPromocion.mockResolvedValue({ ...PROMOCION, items: [] });
    renderPagina();
    await screen.findByText("test promo");

    await user.click(screen.getByRole("button", { name: "test promo" }));

    const cerrar = await screen.findByRole("button", { name: /cerrar la promoción/i });
    expect(cerrar.className).toContain("before:content-['']");
    expect(cerrar.className).toContain("before:h-11");
    expect(cerrar.className).toContain("before:w-11");
  });
});
