import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
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
    // Aparece tres veces: en la lista editable del form, en la vista previa y
    // en "este texto se va a dibujar" de la solapa Imágenes (PreviaTextoImpreso
    // muestra el mismo beneficio antes de generar con IA).
    expect(screen.getAllByText("Beneficio existente")).toHaveLength(3);
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
    expect(within(preview).getAllByText("$ 48.900").length).toBeGreaterThan(0);
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

    const tabPreview = screen.getByRole("button", { name: /Vista previa/i });
    fireEvent.click(tabPreview);

    expect(tabPreview).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Editar/i })).toHaveAttribute("aria-pressed", "false");
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

    fireEvent.click(screen.getByRole("button", { name: /Vista previa/i }));
    expect(screen.getByRole("button", { name: /Vista previa/i })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(screen.getByRole("button", { name: /Editar/i })).toHaveAttribute("aria-pressed", "true");
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

describe("AdminProductoForm — doble submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  function completarRequeridos() {
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Descripción" } });
    fireEvent.change(screen.getByLabelText("Precio"), { target: { value: "1000" } });
  }

  it("un segundo submit con el primero en vuelo no dispara otro POST", async () => {
    let resolver;
    productsApi.createProduct.mockImplementation(
      () => new Promise((res) => {
        resolver = res;
      }),
    );
    renderForm();
    completarRequeridos();

    const form = document.getElementById("form-producto");
    // Primer submit: arranca el guardado. Segundo: Enter en un input de texto
    // mientras el POST sigue en vuelo.
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(productsApi.createProduct).toHaveBeenCalledTimes(1);

    resolver({ id: 1 });
    await waitFor(() => {
      expect(screen.getByText("Listado (mock)")).toBeInTheDocument();
    });
  });

  it("deshabilita los campos mientras el guardado está en vuelo", async () => {
    let resolver;
    productsApi.createProduct.mockImplementation(
      () => new Promise((res) => {
        resolver = res;
      }),
    );
    renderForm();
    completarRequeridos();

    fireEvent.submit(document.getElementById("form-producto"));

    // Editar durante el vuelo se perdería en silencio: el submit exitoso hace
    // setSucio(false) y navega, descartando lo tipeado después del POST.
    expect(screen.getByLabelText("Nombre")).toBeDisabled();

    resolver({ id: 1 });
    await waitFor(() => {
      expect(screen.getByText("Listado (mock)")).toBeInTheDocument();
    });
  });
});

describe("AdminProductoForm — Enter en el Nombre de una especificación", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("no guarda el producto: previene el submit implícito y pasa el foco al Valor", () => {
    renderForm();

    const nombreSpec = screen.getByPlaceholderText("Nombre (ej: Material)");
    fireEvent.change(nombreSpec, { target: { value: "Material" } });

    // `fireEvent` devuelve false cuando el handler llamó a preventDefault —
    // que es lo que frena la implicit submission del form en un navegador real
    // (jsdom no la implementa, así que se fija el contrato, no el síntoma).
    const noPrevenido = fireEvent.keyDown(nombreSpec, { key: "Enter" });

    expect(noPrevenido).toBe(false);
    expect(productsApi.createProduct).not.toHaveBeenCalled();
    expect(screen.getByPlaceholderText("Valor (ej: ABS)")).toHaveFocus();
    // El borrador no se descarta: sigue esperando el Valor.
    expect(nombreSpec).toHaveValue("Material");
  });

  it("Enter en cualquier otra tecla del Nombre no hace nada raro", () => {
    renderForm();

    const nombreSpec = screen.getByPlaceholderText("Nombre (ej: Material)");
    const noPrevenido = fireEvent.keyDown(nombreSpec, { key: "a" });

    expect(noPrevenido).toBe(true);
  });
});

describe("AdminProductoForm — botón Atrás del navegador (popstate)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("con el formulario sucio, Atrás pide confirmación y cancelar re-empuja el centinela", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    const push = vi.spyOn(window.history, "pushState");
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });

    // Al ensuciarse, el hook empujó una entrada centinela.
    expect(push).toHaveBeenCalledTimes(1);

    fireEvent.popState(window);

    expect(confirmar).toHaveBeenCalled();
    // Canceló: se re-empuja el centinela para quedarse en el editor.
    expect(push).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Lámpara");

    push.mockRestore();
    confirmar.mockRestore();
  });

  it("con el formulario sucio, confirmar la salida consume la entrada real con otro back", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    renderForm();

    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Lámpara" } });
    fireEvent.popState(window);

    expect(confirmar).toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);

    back.mockRestore();
    confirmar.mockRestore();
  });

  it("con el formulario limpio, Atrás no pregunta nada ni empuja centinelas", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    const push = vi.spyOn(window.history, "pushState");
    renderForm();

    fireEvent.popState(window);

    expect(confirmar).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    push.mockRestore();
    confirmar.mockRestore();
  });
});

describe("AdminProductoForm — reemplazo de fotos ya guardadas", () => {
  beforeAll(() => {
    // jsdom no implementa la API de object URLs que usa MediaUploader para
    // las previews de los archivos recién elegidos.
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  function productoConDosFotos() {
    return {
      id: 1,
      nombre: "Lámpara",
      descripcion: "Descripción",
      precio: "1000",
      etiqueta: null,
      categoria: null,
      stock: 5,
      fraseComercial: null,
      porQueLoVasAQuerer: null,
      tePasaEsto: null,
      beneficios: [],
      usos: [],
      idealPara: [],
      incluye: [],
      especificaciones: [],
      caracteristicas: [],
      fotos: [
        { id: 11, url: "portada.jpg" },
        { id: 12, url: "problema.jpg" },
      ],
      video: null,
    };
  }

  it("reemplazar la portada no borra la foto anterior en el servidor", async () => {
    productsApi.getProductById.mockResolvedValue(productoConDosFotos());
    renderForm("/catalogo/admin/productos/1/editar");

    fireEvent.change(await screen.findByLabelText(/Reemplazar foto de portada/i), {
      target: { files: [new File(["x"], "nueva-portada.png", { type: "image/png" })] },
    });

    // Reemplazar no acorta el array: la foto vieja sale del listado porque en
    // su lugar quedó la nueva, no porque el admin la haya dado de baja. Solo
    // el PUT del submit decide qué se borra realmente.
    await waitFor(() => {
      expect(screen.getByAltText("Foto de portada")).toHaveAttribute("src", "blob:mock-url");
    });
    expect(productsApi.deletePhoto).not.toHaveBeenCalled();
  });

  it("la foto nueva de la portada llega al submit en la posición 0", async () => {
    productsApi.getProductById.mockResolvedValue(productoConDosFotos());
    productsApi.updateProduct.mockResolvedValue({ id: 1 });
    renderForm("/catalogo/admin/productos/1/editar");

    fireEvent.change(await screen.findByLabelText(/Reemplazar foto de portada/i), {
      target: { files: [new File(["x"], "nueva-portada.png", { type: "image/png" })] },
    });

    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() => {
      expect(productsApi.updateProduct).toHaveBeenCalled();
    });
    const [, data] = productsApi.updateProduct.mock.calls[0];
    expect(data.fotosNuevas.map((f) => f.name)).toEqual(["nueva-portada.png"]);
    expect(data.fotosExistentes).toEqual([12]);
    expect(data.ordenFotos).toEqual([
      { tipo: "nueva", index: 0 },
      { tipo: "existente", id: 12 },
    ]);
  });

  it("quitar una foto ya guardada la borra y no deja el aviso de cambios sin guardar", async () => {
    productsApi.getProductById.mockResolvedValue(productoConDosFotos());
    productsApi.deletePhoto.mockResolvedValue({
      ...productoConDosFotos(),
      fotos: [{ id: 12, url: "problema.jpg" }],
    });
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderForm("/catalogo/admin/productos/1/editar");

    fireEvent.click(await screen.findByRole("button", { name: /Quitar foto de portada/i }));

    await waitFor(() => {
      expect(productsApi.deletePhoto).toHaveBeenCalledWith(1, 11);
    });

    // El borrado ya quedó persistido: no es un cambio pendiente, así que
    // salir del editor no tiene por qué pedir confirmación.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(confirmar).not.toHaveBeenCalled();
    confirmar.mockRestore();
  });
});

describe("AdminProductoForm — refrescar fotos al adoptar imágenes generadas", () => {
  // Reproduce el hallazgo del review: `refrescarFotos` (disparado por
  // `onAdoptadas` desde la Galería de generadas) pedía el producto entero y
  // reemplazaba `valores` completo — perdiendo cualquier foto arrastrada en
  // la solapa que todavía no se había subido. El fix mergea: persistidas del
  // servidor primero, locales sin subir después.
  beforeAll(() => {
    global.URL.createObjectURL = vi.fn(() => "blob:mock-local");
    global.URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  function productoConDosFotos() {
    return {
      id: 1,
      nombre: "Lámpara",
      descripcion: "Descripción",
      precio: "1000",
      etiqueta: null,
      categoria: null,
      stock: 5,
      fraseComercial: null,
      porQueLoVasAQuerer: null,
      tePasaEsto: null,
      beneficios: [],
      usos: [],
      idealPara: [],
      incluye: [],
      especificaciones: [],
      caracteristicas: [],
      fotos: [
        { id: 11, url: "portada.jpg" },
        { id: 12, url: "problema.jpg" },
      ],
      video: null,
    };
  }

  /** Lo que devolvería el servidor DESPUÉS de adoptar: una tercera foto persistida. */
  function productoConTresFotos() {
    return {
      ...productoConDosFotos(),
      fotos: [
        { id: 11, url: "portada.jpg" },
        { id: 12, url: "problema.jpg" },
        { id: 13, url: "generada-adoptada.jpg" },
      ],
    };
  }

  function mockearGeneradas() {
    productsApi.getImagenesGeneradas.mockResolvedValue({
      carpeta: "productos/X",
      imagenes: [{ publicId: "gen-1", nombre: "generada.jpg", url: "generada.jpg", adoptada: false }],
    });
    productsApi.adoptarImagenesGeneradas.mockResolvedValue({ agregadas: 1 });
  }

  async function irAImagenesYSeleccionarGenerada() {
    // Con `/Imágenes/i` a secas también matchea "Generar imágenes" (el botón
    // de la sección de generación, que vive en la misma solapa): se acota la
    // búsqueda a la barra de pestañas.
    const barraPaneles = screen.getByRole("group", { name: "Panel visible" });
    fireEvent.click(within(barraPaneles).getByRole("button", { name: /Imágenes/i }));
    const miniatura = await screen.findByAltText("generada.jpg");
    fireEvent.click(miniatura.closest("button"));
  }

  it("una foto local sin subir sobrevive a refrescar las fotos tras adoptar", async () => {
    // Primera llamada: la carga inicial del editor. Segunda: la que dispara
    // `refrescarFotos` al adoptar — el servidor ya tiene la tercera foto.
    productsApi.getProductById
      .mockResolvedValueOnce(productoConDosFotos())
      .mockResolvedValueOnce(productoConTresFotos());
    mockearGeneradas();

    renderForm("/catalogo/admin/productos/1/editar");
    await screen.findByAltText("Foto de portada");

    await irAImagenesYSeleccionarGenerada();

    // Agrega una foto a la galería que NO está subida: no tiene id numérico,
    // solo el `file` recién elegido. Es la que el bug original perdía.
    fireEvent.change(screen.getByLabelText("Agregar fotos a la galería"), {
      target: { files: [new File(["x"], "local-sin-subir.png", { type: "image/png" })] },
    });
    expect(await screen.findByAltText("Foto 3 de la galería")).toHaveAttribute(
      "src",
      "blob:mock-local",
    );

    fireEvent.click(screen.getByRole("button", { name: /agregar a la ficha/i }));

    // `refrescarFotos` pidió el producto de nuevo.
    await waitFor(() => {
      expect(productsApi.getProductById).toHaveBeenCalledTimes(2);
    });

    // La foto local sigue ahí — ahora en la posición 4 porque el refresco trajo
    // una tercera foto persistida (la recién adoptada) antes que ella. Si el
    // bug siguiera presente, esta foto ya no existiría en ningún lado.
    expect(await screen.findByAltText("Foto 4 de la galería")).toHaveAttribute(
      "src",
      "blob:mock-local",
    );
  });

  it("reemplazar la portada sobrevive a refrescar las fotos tras adoptar, sin resucitar la vieja", async () => {
    // Reproduce el CRÍTICO del review: el merge de `refrescarFotos` concatenaba
    // (servidor primero, locales después), lo que devolvía la portada VIEJA a
    // la posición 0 y mandaba el reemplazo local al final — invirtiendo justo
    // lo que el admin acababa de hacer.
    productsApi.getProductById
      .mockResolvedValueOnce(productoConDosFotos())
      .mockResolvedValueOnce(productoConTresFotos());
    mockearGeneradas();

    const { container } = renderForm("/catalogo/admin/productos/1/editar");
    await screen.findByAltText("Foto de portada");

    fireEvent.change(screen.getByLabelText(/Reemplazar foto de portada/i), {
      target: { files: [new File(["x"], "nueva-portada.png", { type: "image/png" })] },
    });
    await waitFor(() => {
      expect(screen.getByAltText("Foto de portada")).toHaveAttribute("src", "blob:mock-local");
    });

    await irAImagenesYSeleccionarGenerada();
    fireEvent.click(screen.getByRole("button", { name: /agregar a la ficha/i }));

    await waitFor(() => {
      expect(productsApi.getProductById).toHaveBeenCalledTimes(2);
    });

    // La local sigue en portada tras el refresco — si el bug siguiera
    // presente, acá volvería a mostrarse la portada vieja del servidor.
    await waitFor(() => {
      expect(screen.getByAltText("Foto de portada")).toHaveAttribute("src", "blob:mock-local");
    });

    // La portada vieja del servidor ("portada.jpg") no reaparece en ningún
    // lado del documento — ni en el uploader ni en la vista previa en vivo.
    const srcs = Array.from(container.querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(srcs.some((src) => src?.includes("portada.jpg"))).toBe(false);
  });

  it("no dispara el spinner de carga de página completa al refrescar las fotos", async () => {
    // Con una sola respuesta para las dos llamadas alcanza: lo que se
    // verifica acá es que el editor no se desmonte, no el contenido final.
    productsApi.getProductById.mockResolvedValue(productoConDosFotos());
    mockearGeneradas();

    renderForm("/catalogo/admin/productos/1/editar");
    await screen.findByAltText("Foto de portada");

    await irAImagenesYSeleccionarGenerada();
    fireEvent.click(screen.getByRole("button", { name: /agregar a la ficha/i }));

    await waitFor(() => {
      expect(productsApi.getProductById).toHaveBeenCalledTimes(2);
    });

    // Si `refrescarFotos` tocara el `cargando` global (el bug original), el
    // editor entero se habría desmontado y reemplazado por el spinner de
    // "Cargando producto…" — este campo, que solo existe en el formulario
    // montado, ya no estaría en el documento.
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.queryByText("Cargando producto…")).not.toBeInTheDocument();
  });
});
