import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCampaniaEditor from "./AdminCampaniaEditor.jsx";
import * as campaniasApi from "../../api/campanias.js";
import * as productsApi from "../../api/products.js";
import * as categoriasApi from "../../api/categorias.js";
import * as promocionesApi from "../../api/promociones.js";

vi.mock("../../api/campanias.js");
vi.mock("../../api/products.js");
vi.mock("../../api/categorias.js");
vi.mock("../../api/promociones.js");

/**
 * El editor de campaña, que es una PÁGINA y no un diálogo.
 *
 * ⚠️ Dos dependencias implícitas de esta pantalla:
 * - `SoloEscritorio` monta los hijos SIEMPRE (los esconde el CSS, que jsdom no
 *   aplica), así que todo lo de adentro es consultable acá.
 * - las opciones (`tipos`, `estados`, `destinos`, `ctaTextoPorDefecto`) llegan
 *   de la API: sin ese mock la pantalla se queda cargando.
 */

const OPCIONES = {
  tipos: [
    { valor: "ESTACIONAL", etiqueta: "Estacional" },
    { valor: "FECHA_ESPECIAL", etiqueta: "Fecha especial" },
  ],
  estados: [
    { valor: "BORRADOR", etiqueta: "Borrador" },
    { valor: "HABILITADA", etiqueta: "Habilitada" },
    { valor: "DESHABILITADA", etiqueta: "Deshabilitada" },
  ],
  destinos: [
    { valor: "CAMPANIA", etiqueta: "Los productos de la campaña" },
    { valor: "CATALOGO", etiqueta: "Todo el catálogo" },
    { valor: "CATEGORIA", etiqueta: "Una categoría" },
    { valor: "PRODUCTO", etiqueta: "Un producto" },
  ],
  ctaTextoPorDefecto: "Ver más",
};

function detalle(extra = {}) {
  return {
    id: 31,
    nombre: "Primavera 2026",
    descripcion: "Nota interna",
    tipo: "ESTACIONAL",
    estado: "HABILITADA",
    desde: "2026-09-21",
    hasta: "2026-09-30",
    prioridad: 5,
    estadoTemporal: "ACTIVA",
    activa: true,
    etiquetaEstado: "Habilitada",
    etiquetaTemporal: "Activa",
    doodleUrl: null,
    doodleEnCatalogo: true,
    doodleEnAdmin: false,
    modalActivo: true,
    modalTitulo: "Llega la primavera",
    modalTexto: "Faltan {dias} días.",
    modalCtaTexto: null,
    modalCtaTipo: "CATALOGO",
    modalCtaReferenciaId: null,
    modalCtaReferencia: null,
    modalFechaObjetivo: "2026-09-21",
    promociones: [],
    productos: [],
    ...extra,
  };
}

function renderEditor(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/catalogo/admin/campanias" element={<div>Centro de Campañas (mock)</div>} />
        <Route path="/catalogo/admin/campanias/nueva" element={<AdminCampaniaEditor />} />
        <Route path="/catalogo/admin/campanias/:id/editar" element={<AdminCampaniaEditor />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  campaniasApi.getOpcionesCampania.mockResolvedValue(OPCIONES);
  campaniasApi.getCampania.mockResolvedValue(detalle());
  campaniasApi.getContadorCampania.mockResolvedValue({ diasFaltantes: 17 });
  categoriasApi.getCategorias.mockResolvedValue([{ id: 4, nombre: "Hogar" }]);
  promocionesApi.getPromociones.mockResolvedValue([]);
  productsApi.getEtiquetas.mockResolvedValue({ etiquetas: [] });
  productsApi.getProducts.mockResolvedValue({ data: [], page: 1, pageSize: 24, total: 0 });
});

describe("AdminCampaniaEditor — alta", () => {
  it("no muestra Doodle, Productos ni Promociones: no hay id al que subirlos", async () => {
    renderEditor("/catalogo/admin/campanias/nueva");

    expect(await screen.findByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Doodle" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Productos de la campaña" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Promociones" })).toBeNull();
    // Tampoco se pide el detalle: no hay campaña que pedir.
    expect(campaniasApi.getCampania).not.toHaveBeenCalled();
  });

  it("precarga las dos fechas con el día que se tocó en el calendario", async () => {
    renderEditor("/catalogo/admin/campanias/nueva?dia=2026-12-25");

    expect(await screen.findByLabelText("Desde")).toHaveValue("2026-12-25");
    expect(screen.getByLabelText(/^Hasta/)).toHaveValue("2026-12-25");
  });

  it("crea la campaña y navega a su edición, donde vive el resto", async () => {
    const usuario = userEvent.setup();
    campaniasApi.crearCampania.mockResolvedValue({ ...detalle(), id: 88 });
    renderEditor("/catalogo/admin/campanias/nueva?dia=2026-12-25");

    await usuario.type(await screen.findByLabelText("Nombre"), "Navidad");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(campaniasApi.crearCampania).toHaveBeenCalledWith(
        expect.objectContaining({ nombre: "Navidad", desde: "2026-12-25", hasta: "2026-12-25" }),
      );
    });
    // Tras crear se aterriza en la edición: el Doodle y la vitrina necesitan id.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Productos de la campaña" })).toBeInTheDocument();
    });
  });
});

describe("AdminCampaniaEditor — edición", () => {
  it("carga el detalle y muestra los chips de estado y de vitrina", async () => {
    campaniasApi.getCampania.mockResolvedValue(
      detalle({ productos: [{ id: 1, nombre: "Vela", sku: "V-1", precio: "100", fotoPortada: null, visibleEnCatalogo: true, stock: 3 }] }),
    );
    renderEditor("/catalogo/admin/campanias/31/editar");

    expect(await screen.findByRole("heading", { name: "Primavera 2026", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Habilitada · Activa")).toBeInTheDocument();
    expect(screen.getByText("1 en la vitrina")).toBeInTheDocument();
  });

  it("el preview muestra el título, el texto del botón por defecto y el contador", async () => {
    renderEditor("/catalogo/admin/campanias/31/editar");

    const preview = await screen.findByTestId("preview-cartel");
    expect(within(preview).getByText("Llega la primavera")).toBeInTheDocument();
    // El placeholder del botón sale de `ctaTextoPorDefecto`, no de una copia local.
    expect(within(preview).getByText("Ver más")).toBeInTheDocument();
    // El número lo cuenta el BACKEND, nunca el reloj del navegador.
    await waitFor(() => {
      expect(campaniasApi.getContadorCampania).toHaveBeenCalledWith("2026-09-21");
    });
    expect(await within(preview).findByText("17")).toBeInTheDocument();
  });

  it("avisa cuando el botón apunta a una vitrina vacía", async () => {
    const usuario = userEvent.setup();
    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(
      await screen.findByRole("radio", { name: /Los productos de la campaña/ }),
    );

    expect(
      screen.getByText(/no hay ningún producto en la vitrina/i),
    ).toBeInTheDocument();
  });

  it("con destino CATEGORÍA ofrece el select y guarda tipo + referencia", async () => {
    const usuario = userEvent.setup();
    campaniasApi.actualizarCampania.mockResolvedValue(detalle());
    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(await screen.findByRole("radio", { name: "Una categoría" }));
    await usuario.selectOptions(await screen.findByLabelText("Elegí la categoría"), "4");
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(campaniasApi.actualizarCampania).toHaveBeenCalledWith(
        31,
        expect.objectContaining({ modalCtaTipo: "CATEGORIA", modalCtaReferenciaId: 4 }),
      );
    });
  });

  it("«Sin botón» guarda el tipo en null", async () => {
    const usuario = userEvent.setup();
    campaniasApi.actualizarCampania.mockResolvedValue(detalle());
    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(await screen.findByRole("radio", { name: "Sin botón" }));
    await usuario.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(campaniasApi.actualizarCampania).toHaveBeenCalledWith(
        31,
        expect.objectContaining({ modalCtaTipo: null, modalCtaReferenciaId: null }),
      );
    });
  });

  it("el selector busca un producto, lo agrega a la vitrina y lo quita", async () => {
    const usuario = userEvent.setup();
    const producto = {
      id: 9,
      nombre: "Vela de soja",
      sku: "V-9",
      precio: "2500",
      fotoPortada: null,
      visibleEnCatalogo: true,
      stock: 4,
    };
    productsApi.getProducts.mockResolvedValue({
      data: [{ ...producto, fotos: [] }],
      page: 1,
      pageSize: 24,
      total: 1,
    });
    campaniasApi.guardarProductosDeCampania
      .mockResolvedValueOnce(detalle({ productos: [producto] }))
      .mockResolvedValueOnce(detalle({ productos: [] }));

    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.type(await screen.findByLabelText("Buscar productos"), "vela");
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ admin: true, search: "vela", page: 1, pageSize: 24 }),
      );
    });

    await usuario.click(await screen.findByRole("button", { name: "Agregar Vela de soja" }));
    await waitFor(() => {
      expect(campaniasApi.guardarProductosDeCampania).toHaveBeenCalledWith(31, [9]);
    });

    await usuario.click(await screen.findByRole("button", { name: "Quitar Vela de soja" }));
    await waitFor(() => {
      expect(campaniasApi.guardarProductosDeCampania).toHaveBeenLastCalledWith(31, []);
    });
  });

  it("si el borrado falla, el motivo se ve DENTRO del diálogo", async () => {
    const usuario = userEvent.setup();
    campaniasApi.eliminarCampania.mockRejectedValue(
      new Error("Tu usuario no tiene permiso para eliminar."),
    );
    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(await screen.findByRole("button", { name: "Eliminar" }));
    await usuario.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    // El diálogo tapa la página con su velo: un error pintado detrás es un
    // error invisible, y el admin vuelve a apretar una acción que ya falló.
    const dialogo = await screen.findByRole("dialog");
    expect(
      await within(dialogo).findByText(/no tiene permiso para eliminar/),
    ).toBeInTheDocument();
  });

  it("eliminar pide confirmación y vuelve al listado", async () => {
    const usuario = userEvent.setup();
    campaniasApi.eliminarCampania.mockResolvedValue({});
    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(await screen.findByRole("button", { name: "Eliminar" }));
    await usuario.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => expect(campaniasApi.eliminarCampania).toHaveBeenCalledWith(31));
    expect(await screen.findByText("Centro de Campañas (mock)")).toBeInTheDocument();
  });
});
