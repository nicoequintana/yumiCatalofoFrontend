import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductoForm from "./AdminProductoForm.jsx";
import * as productsApi from "../../api/products.js";
import * as categoriasApi from "../../api/categorias.js";

vi.mock("../../api/products.js");
vi.mock("../../api/categorias.js");

// `useWhatsapp` fetches its own config; the preview renders inert look-alikes
// anyway, so keep the real button out of these tests.
vi.mock("../../components/BotonWhatsapp.jsx", () => ({ default: () => null }));

function renderForm(ruta = "/catalogo/admin/productos/nuevo") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/catalogo/admin/productos" element={<div>Listado (mock)</div>} />
        <Route path="/catalogo/admin/productos/nuevo" element={<AdminProductoForm />} />
        <Route path="/catalogo/admin/productos/:id/editar" element={<AdminProductoForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminProductoForm — contenido comercial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("muestra los 3 campos de texto comercial y los envía en el submit", async () => {
    productsApi.createProduct.mockResolvedValue({ id: 1 });
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Frase comercial (opcional)"), {
      target: { value: "Iluminá donde quieras." },
    });
    fireEvent.change(screen.getByLabelText("¿Por qué lo vas a querer? (opcional)"), {
      target: { value: "Porque te sirve." },
    });
    fireEvent.change(screen.getByLabelText("¿Te pasa esto? (opcional)"), {
      target: { value: "¿Te pasó no tener luz?" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          fraseComercial: "Iluminá donde quieras.",
          porQueLoVasAQuerer: "Porque te sirve.",
          tePasaEsto: "¿Te pasó no tener luz?",
        }),
      );
    });
  });

  it("agrega un beneficio y lo envía en el submit", async () => {
    productsApi.createProduct.mockResolvedValue({ id: 1 });
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "1000" } });

    const seccionBeneficios = screen.getByText("Beneficios").closest("div");
    fireEvent.change(
      seccionBeneficios.querySelector('input[placeholder="Ej: Recargable por USB"]'),
      { target: { value: "Recargable por USB" } },
    );
    fireEvent.click(within(seccionBeneficios).getByRole("button", { name: "Agregar" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficios: [{ texto: "Recargable por USB" }],
        }),
      );
    });
  });

  it("precarga los campos comerciales en modo edición", async () => {
    productsApi.getProductById.mockResolvedValue({
      id: 1,
      nombre: "Lámpara",
      descripcion: "Descripción",
      precio: "1000",
      etiqueta: null,
      categoria: null,
      stock: 5,
      fraseComercial: "Frase existente",
      porQueLoVasAQuerer: "Ya cargado",
      tePasaEsto: "Ya cargado también",
      beneficios: [{ id: 10, texto: "Beneficio existente" }],
      usos: [],
      idealPara: [],
      incluye: [],
      especificaciones: [],
      caracteristicas: [],
      fotos: [],
      video: null,
    });

    renderForm("/catalogo/admin/productos/1/editar");

    expect(await screen.findByDisplayValue("Frase existente")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ya cargado")).toBeInTheDocument();
    // Aparece dos veces: en la lista editable del form y en la vista previa.
    expect(screen.getAllByText("Beneficio existente")).toHaveLength(2);
  });

  it("agrega una especificación y la envía en el submit", async () => {
    productsApi.createProduct.mockResolvedValue({ id: 1 });
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "1000" } });

    fireEvent.change(screen.getByPlaceholderText("Nombre (ej: Material)"), {
      target: { value: "Material" },
    });
    fireEvent.change(screen.getByPlaceholderText("Valor (ej: ABS)"), {
      target: { value: "ABS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "+ Agregar especificación" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          especificaciones: [{ nombre: "Material", valor: "ABS" }],
        }),
      );
    });
  });
});

describe("AdminProductoForm — vista previa en vivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("renderiza un panel de vista previa junto al formulario", () => {
    renderForm();
    expect(screen.getByTestId("preview-ficha")).toBeInTheDocument();
  });

  it("refleja el nombre tipeado en la vista previa sin guardar", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara Nómade" } });

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getByText("Lámpara Nómade")).toBeInTheDocument();
    expect(productsApi.createProduct).not.toHaveBeenCalled();
    expect(productsApi.updateProduct).not.toHaveBeenCalled();
  });

  it("refleja el precio formateado en la vista previa", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "48900" } });

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getAllByText("$ 48.900,00").length).toBeGreaterThan(0);
  });

  it("refleja la frase comercial y la oculta al borrarla", () => {
    renderForm();

    const campoFrase = screen.getByLabelText("Frase comercial (opcional)");
    fireEvent.change(campoFrase, { target: { value: "Iluminá donde quieras." } });

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getByText("Iluminá donde quieras.")).toBeInTheDocument();

    fireEvent.change(campoFrase, { target: { value: "" } });
    expect(within(preview).queryByText("Iluminá donde quieras.")).not.toBeInTheDocument();
  });

  it("muestra el badge Agotado en la vista previa cuando el stock es 0", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "0" } });

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getByText("Agotado")).toBeInTheDocument();
  });

  it("la vista previa muestra un placeholder de nombre mientras el campo está vacío", () => {
    renderForm();

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getByText("Nombre del producto")).toBeInTheDocument();
  });

  it("los CTA de la vista previa quedan inertes y reflejan el stock real", () => {
    renderForm();

    // Un producto nuevo arranca con stock 0, así que el CTA refleja "Sin
    // stock" — igual que lo vería el cliente.
    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getByText("Sin stock")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "5" } });
    expect(within(preview).getByText("Agregar al carrito")).toBeInTheDocument();

    // Los CTA son los componentes reales, neutralizados con `inert` — así el
    // preview no puede divergir del público ni agregar al carrito del admin.
    const botonCarrito = within(preview).getByRole("button", { name: /Agregar al carrito/i });
    expect(botonCarrito.closest("[inert]")).not.toBeNull();
  });

  it("arranca mostrando la plantilla completa, con las secciones vacías marcadas", () => {
    renderForm();

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).getByText("¿Por qué lo vas a querer?")).toBeInTheDocument();
    expect(within(preview).getByText("Ficha técnica")).toBeInTheDocument();
    expect(within(preview).getAllByTestId("bloque-vacio").length).toBeGreaterThan(0);
  });

  it("permite pasar a la vista real, sin secciones vacías", () => {
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: /Ver como cliente/i }));

    const preview = screen.getByTestId("preview-ficha");
    expect(within(preview).queryByText("¿Por qué lo vas a querer?")).not.toBeInTheDocument();
    expect(within(preview).queryAllByTestId("bloque-vacio")).toHaveLength(0);
  });

  it("el rótulo del panel dice qué se está mirando", () => {
    renderForm();

    expect(screen.getByText("Plantilla completa")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ver como cliente/i }));
    expect(screen.getByText("Así lo ve el cliente")).toBeInTheDocument();
    expect(screen.queryByText("Plantilla completa")).not.toBeInTheDocument();
  });

  it("permite alternar la vista previa entre escritorio y móvil", () => {
    renderForm();

    const botonMovil = screen.getByRole("button", { name: "Vista móvil" });
    fireEvent.click(botonMovil);

    expect(botonMovil).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vista escritorio" })).toHaveAttribute("aria-pressed", "false");
  });

  it("permite alternar entre las pestañas Editar y Vista previa en mobile", () => {
    renderForm();

    const tabPreview = screen.getByRole("tab", { name: /Vista previa/i });
    fireEvent.click(tabPreview);

    expect(tabPreview).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Editar/i })).toHaveAttribute("aria-selected", "false");
  });
});

describe("AdminProductoForm — configuración del catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("muestra la sección de configuración del catálogo", () => {
    renderForm();
    expect(screen.getByText("Configuración del catálogo")).toBeInTheDocument();
  });

  it("muestra el SKU como solo lectura en modo edición", async () => {
    productsApi.getProductById.mockResolvedValue({
      id: 1,
      nombre: "Lámpara",
      descripcion: "Descripción",
      precio: "1000",
      sku: "YIM-ILU-0042",
      etiqueta: null,
      categoria: null,
      stock: 5,
      visibleEnCatalogo: true,
      destacado: false,
      orden: 10,
      beneficios: [],
      usos: [],
      idealPara: [],
      incluye: [],
      especificaciones: [],
      caracteristicas: [],
      fotos: [],
      video: null,
    });

    renderForm("/catalogo/admin/productos/1/editar");

    expect(await screen.findByText("YIM-ILU-0042")).toBeInTheDocument();
    // Es un dato mostrado, no un campo editable.
    expect(screen.queryByLabelText("SKU")).not.toBeInTheDocument();
  });

  it("muestra visibilidad, destacado y orden como solo lectura, con enlace al listado", async () => {
    productsApi.getProductById.mockResolvedValue({
      id: 1,
      nombre: "Lámpara",
      descripcion: "Descripción",
      precio: "1000",
      sku: "YIM-ILU-0042",
      etiqueta: null,
      categoria: null,
      stock: 5,
      visibleEnCatalogo: true,
      destacado: false,
      orden: 7,
      beneficios: [],
      usos: [],
      idealPara: [],
      incluye: [],
      especificaciones: [],
      caracteristicas: [],
      fotos: [],
      video: null,
    });

    renderForm("/catalogo/admin/productos/1/editar");

    await screen.findByText("YIM-ILU-0042");

    const seccion = screen.getByTestId("config-catalogo");
    expect(within(seccion).getByText("Visible en el catálogo")).toBeInTheDocument();
    expect(within(seccion).getByText("Destacado")).toBeInTheDocument();
    expect(within(seccion).getByText("7")).toBeInTheDocument();

    // No se editan acá: viven en el listado, que guarda al instante vía PATCH.
    expect(within(seccion).queryByRole("switch")).not.toBeInTheDocument();
    expect(within(seccion).getByRole("link", { name: /listado/i })).toHaveAttribute(
      "href",
      "/catalogo/admin/productos",
    );
  });

  it("categoría y stock siguen siendo editables y se envían en el submit", async () => {
    categoriasApi.getCategorias.mockResolvedValue([{ id: 3, nombre: "Iluminación" }]);
    productsApi.createProduct.mockResolvedValue({ id: 1 });

    renderForm();

    await screen.findByRole("option", { name: "Iluminación" });

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Categoría (opcional)"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Stock"), { target: { value: "12" } });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(productsApi.createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: "3", stock: "12" }),
      );
    });
  });
});

describe("AdminProductoForm — fallos de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sigue renderizando el formulario aunque falle la carga de categorías", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderForm();

    // El desplegable queda sin opciones, pero la página sigue usable.
    expect(await screen.findByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Categoría (opcional)")).toBeInTheDocument();
  });

  it("avisa que no se pudieron cargar las categorías", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderForm();

    expect(await screen.findByText(/No se pudieron cargar las categorías/i)).toBeInTheDocument();
  });

  it("muestra un error en vez de quedarse cargando cuando falla la carga del producto", async () => {
    categoriasApi.getCategorias.mockResolvedValue([]);
    productsApi.getProductById.mockRejectedValue(new Error("Failed to fetch"));

    renderForm("/catalogo/admin/productos/1/editar");

    expect(await screen.findByText(/No se pudo cargar el producto/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando producto…")).not.toBeInTheDocument();
  });
});

describe("AdminProductoForm — guardar desde la pestaña de vista previa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("vuelve a la pestaña Editar al intentar guardar desde la vista previa", () => {
    // En pantallas chicas la columna del formulario se oculta con `hidden`.
    // Un requerido vacío dentro de un contenedor `display:none` no se puede
    // enfocar, así que el navegador cancela el submit sin decir nada: el
    // usuario apretaba Guardar y no pasaba absolutamente nada.
    renderForm();

    fireEvent.click(screen.getByRole("tab", { name: /Vista previa/i }));
    expect(screen.getByRole("tab", { name: /Vista previa/i })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("tab", { name: /Editar/i })).toHaveAttribute("aria-selected", "true");
  });
});

describe("AdminProductoForm — cambios sin guardar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("no marca cambios sin guardar al abrir el formulario", () => {
    renderForm();
    expect(screen.queryByText("Cambios sin guardar")).not.toBeInTheDocument();
  });

  it("marca cambios sin guardar apenas se edita un campo", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  });

  it("sale sin preguntar si no se tocó nada", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmar).not.toHaveBeenCalled();
    expect(screen.getByText("Listado (mock)")).toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("pide confirmación antes de descartar cambios sin guardar", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmar).toHaveBeenCalled();
    expect(screen.getByText("Listado (mock)")).toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("se queda en el formulario si se rechaza la confirmación", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByText("Listado (mock)")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Lámpara");
    confirmar.mockRestore();
  });

  it("también protege el botón Volver", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.click(screen.getByRole("button", { name: /Volver/i }));

    expect(confirmar).toHaveBeenCalled();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Lámpara");
    confirmar.mockRestore();
  });

  it("también protege los enlaces que salen del editor (sidebar incluido)", () => {
    // Los <Link> de react-router esquivan tanto `beforeunload` como el botón
    // Cancelar: sin este guard, tocar "Órdenes" en el sidebar tiraba a la
    // basura todo lo cargado sin preguntar nada.
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.click(screen.getByRole("link", { name: /listado de productos/i }));

    expect(confirmar).toHaveBeenCalled();
    expect(screen.queryByText("Listado (mock)")).not.toBeInTheDocument();
    confirmar.mockRestore();
  });

  it("no intercepta enlaces cuando no hay cambios", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm();

    fireEvent.click(screen.getByRole("link", { name: /listado de productos/i }));

    expect(confirmar).not.toHaveBeenCalled();
    confirmar.mockRestore();
  });

  it("avisa al cerrar o recargar la pestaña con cambios pendientes", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });

    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(true);
  });

  it("no avisa al cerrar la pestaña si no hay cambios", () => {
    renderForm();

    const evento = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(evento);

    expect(evento.defaultPrevented).toBe(false);
  });
});
