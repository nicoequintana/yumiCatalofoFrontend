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
  it("muestra TODAS las secciones, con las que necesitan id esperando y explicando por que", async () => {
    // Esconderlas hacia que la pantalla pareciera incompleta: quien entra por
    // primera vez no sabe que la vitrina existe, y quien ya la conoce la busca
    // y no la encuentra. Se muestran bloqueadas, que ademas anticipa el paso
    // siguiente. El Doodle y la vitrina van a endpoints `/:id/...`: no se le
    // puede subir una imagen a algo que todavia no existe.
    renderEditor("/catalogo/admin/campanias/nueva");

    expect(await screen.findByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Productos de la campaña" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Promociones" })).toBeInTheDocument();

    // Y ninguna de las dos deja operar todavia.
    expect(screen.queryByLabelText("Buscar productos")).toBeNull();
    expect(screen.getAllByText(/Guardá la campaña/i).length).toBeGreaterThan(0);

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

describe("AdminCampaniaEditor — los errores de las secciones que guardan solas", () => {
  /**
   * Las secciones 3 y 4 viven DESPUÉS de un formulario de ~1.686 px. Un error
   * pintado arriba de todo existe, está bien calculado y no entra en el
   * viewport de quien apretó el botón: se lee como un botón que no hace nada, y
   * el admin lo vuelve a apretar. Misma familia que el error del diálogo de
   * borrado.
   */
  it("el fallo al guardar la vitrina se ve DENTRO de la sección de productos", async () => {
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
    campaniasApi.getCampania.mockResolvedValue(detalle({ productos: [producto] }));
    campaniasApi.guardarProductosDeCampania.mockRejectedValue(
      new Error("No se pudo guardar la vitrina."),
    );

    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(await screen.findByRole("button", { name: "Quitar Vela de soja" }));

    const seccion = screen.getByRole("region", { name: "Productos de la campaña" });
    expect(await within(seccion).findByText("No se pudo guardar la vitrina.")).toBeInTheDocument();
  });

  it("el fallo al guardar las promociones se ve DENTRO de la sección de promociones", async () => {
    const usuario = userEvent.setup();
    promocionesApi.getPromociones.mockResolvedValue([
      { id: 3, nombre: "20% en velas", habilitada: true },
    ]);
    campaniasApi.guardarPromocionesDeCampania.mockRejectedValue(
      new Error("No se pudo guardar la lista de promociones."),
    );

    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(await screen.findByRole("checkbox", { name: /20% en velas/ }));

    const seccion = screen.getByRole("region", { name: "Promociones" });
    expect(
      await within(seccion).findByText("No se pudo guardar la lista de promociones."),
    ).toBeInTheDocument();
  });
});

describe("AdminCampaniaEditor — «Traer los de las promociones»", () => {
  const promocionAsociada = { id: 3, nombre: "20% en velas" };

  /**
   * El botón dispara N `getPromocion` en paralelo. Sin `try/catch` la promesa
   * quedaba rechazada sin manejar: ni error, ni spinner, ni productos. El 401
   * NO es uno de los casos mudos —`fetchAutenticado` lo intercepta y redirige
   * al login—, pero el 404 de una promoción que otro admin borró, el 502 con
   * HTML del proxy y el timeout de 15 s sí lo eran.
   */
  it("un fallo al traer una promoción muestra el motivo JUNTO al botón", async () => {
    const usuario = userEvent.setup();
    campaniasApi.getCampania.mockResolvedValue(detalle({ promociones: [promocionAsociada] }));
    promocionesApi.getPromocion.mockRejectedValue(new Error("Promoción no encontrada."));

    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(
      await screen.findByRole("button", { name: "Traer los de las promociones" }),
    );

    const vitrina = screen.getByRole("region", { name: /En la vitrina/ });
    expect(await within(vitrina).findByText(/No se pudieron traer/i)).toBeInTheDocument();
    // Todo o nada: la vitrina no se toca, y el mensaje tiene que decirlo para
    // que el admin no crea que agregó algo a medias.
    expect(within(vitrina).getByText(/no se agregó ninguno/i)).toBeInTheDocument();
    expect(campaniasApi.guardarProductosDeCampania).not.toHaveBeenCalled();
  });

  it("cuando las promociones responden, agrega sus productos a la vitrina", async () => {
    const usuario = userEvent.setup();
    campaniasApi.getCampania.mockResolvedValue(detalle({ promociones: [promocionAsociada] }));
    promocionesApi.getPromocion.mockResolvedValue({
      id: 3,
      nombre: "20% en velas",
      items: [{ productId: 9 }, { productId: 12 }],
    });
    campaniasApi.guardarProductosDeCampania.mockResolvedValue(detalle());

    renderEditor("/catalogo/admin/campanias/31/editar");

    await usuario.click(
      await screen.findByRole("button", { name: "Traer los de las promociones" }),
    );

    await waitFor(() => {
      expect(campaniasApi.guardarProductosDeCampania).toHaveBeenCalledWith(31, [9, 12]);
    });
  });
});

describe("AdminCampaniaEditor — el destino del CTA", () => {
  /**
   * El nombre salía SOLO de `campania.modalCtaReferencia`, que es el detalle
   * cargado y no se refresca al elegir. El admin veía el producto ANTERIOR
   * aunque el PUT persistiera el nuevo: el dato guardado era correcto y lo que
   * mostraba la pantalla era mentira, en la pantalla donde se decide a dónde
   * manda un cartel que ve todo el mundo.
   */
  it("al elegir otro producto, «Elegido» muestra el nuevo en el acto", async () => {
    const usuario = userEvent.setup();
    campaniasApi.getCampania.mockResolvedValue(
      detalle({
        modalCtaTipo: "PRODUCTO",
        modalCtaReferenciaId: 12,
        modalCtaReferencia: { id: 12, nombre: "Velador LED" },
      }),
    );
    productsApi.getProducts.mockResolvedValue({
      data: [{ id: 45, nombre: "Reloj Clásico", sku: "R-45", fotos: [], visibleEnCatalogo: true }],
      page: 1,
      pageSize: 8,
      total: 1,
    });

    renderEditor("/catalogo/admin/campanias/31/editar");

    const destinos = await screen.findByRole("group", { name: "A dónde lleva el botón" });
    // El nombre vive en el párrafo "Elegido: …", no en la lista de resultados:
    // el resultado clickeado sigue listado, así que la aserción tiene que
    // mirar el cartel y no el documento entero.
    const elegido = () => within(destinos).getByText(/^Elegido:/).textContent;
    expect(elegido()).toBe("Elegido: Velador LED");

    await usuario.type(within(destinos).getByLabelText("Buscá el producto"), "reloj");
    await usuario.click(await within(destinos).findByRole("button", { name: /Reloj Clásico/ }));

    await waitFor(() => expect(elegido()).toBe("Elegido: Reloj Clásico"));
  });
});
