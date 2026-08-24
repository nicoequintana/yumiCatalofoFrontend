import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProductoDetalle from "./ProductoDetalle.jsx";
import * as productsApi from "../api/products.js";
import { ToastProvider } from "../context/ToastContext.jsx";

vi.mock("../api/products.js");

// useWhatsapp fetches its own config; keep it out of scope for these tests
// by mocking the button that depends on it.
vi.mock("../components/BotonWhatsapp.jsx", () => ({
  default: () => null,
}));

const PRODUCTO_BASE = {
  id: 1,
  nombre: "Reloj Clásico",
  descripcion: "Un reloj elegante.",
  precio: "1000",
  etiqueta: null,
  caracteristicas: [],
  fotos: [],
  video: null,
  relacionados: [],
  fraseComercial: null,
  porQueLoVasAQuerer: null,
  tePasaEsto: null,
  beneficios: [],
  usos: [],
  idealPara: [],
  incluye: [],
  especificaciones: [],
  stock: 10,
};

const RELACIONADO = {
  id: 2,
  nombre: "Reloj Deportivo",
  precio: "800",
  etiqueta: null,
  categoria: null,
  fotos: [],
};

function renderPagina(id = "1") {
  return render(
    <MemoryRouter initialEntries={[`/producto/${id}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<div>Catálogo (mock)</div>} />
          <Route path="/producto/:idSlug" element={<ProductoDetalle />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ProductoDetalle - relacionados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza los productos relacionados como ProductCard cuando están presentes", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      relacionados: [RELACIONADO],
    });

    renderPagina();

    expect(await screen.findByText("También te puede interesar")).toBeInTheDocument();
    expect(screen.getByText("Reloj Deportivo")).toBeInTheDocument();
  });

  it("no renderiza la sección cuando relacionados está vacío", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE, relacionados: [] });

    renderPagina();

    await screen.findAllByText("Reloj Clásico");
    expect(screen.queryByText("También te puede interesar")).not.toBeInTheDocument();
  });

  it("no renderiza la sección cuando relacionados está ausente", async () => {
    const sinRelacionados = { ...PRODUCTO_BASE };
    delete sinRelacionados.relacionados;
    productsApi.getProductById.mockResolvedValue(sinRelacionados);

    renderPagina();

    await screen.findAllByText("Reloj Clásico");
    expect(screen.queryByText("También te puede interesar")).not.toBeInTheDocument();
  });

  it("el card de un producto relacionado enlaza a su propia página de detalle", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      relacionados: [RELACIONADO],
    });

    renderPagina();

    const link = await screen.findByRole("link", { name: /Reloj Deportivo/ });
    expect(link).toHaveAttribute("href", "/producto/2-reloj-deportivo");
  });
});

describe("ProductoDetalle — contenido comercial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra la frase comercial cuando existe", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      fraseComercial: "Iluminá donde quieras.",
    });
    renderPagina();
    expect(await screen.findByText("Iluminá donde quieras.")).toBeInTheDocument();
  });

  it("no muestra la frase comercial cuando no existe", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE, fraseComercial: null });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);
    expect(screen.queryByText("Iluminá donde quieras.")).not.toBeInTheDocument();
  });

  it("muestra la sección ¿Por qué lo vas a querer? solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      porQueLoVasAQuerer: "Porque te simplifica la vida.",
    });
    renderPagina();
    expect(await screen.findByText("¿Por qué lo vas a querer?")).toBeInTheDocument();
    expect(screen.getByText("Porque te simplifica la vida.")).toBeInTheDocument();
  });

  it("no renderiza ¿Por qué lo vas a querer? cuando el campo es null", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE, porQueLoVasAQuerer: null });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);
    expect(screen.queryByText("¿Por qué lo vas a querer?")).not.toBeInTheDocument();
  });

  it("muestra ¿Qué problema resuelve? solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      tePasaEsto: "¿Te pasó no tener enchufe cerca?",
    });
    renderPagina();
    expect(await screen.findByText("¿Qué problema resuelve?")).toBeInTheDocument();
  });

  it("muestra hasta 3 beneficios rápidos en el hero", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      beneficios: [
        { id: 1, texto: "Recargable por USB" },
        { id: 2, texto: "Fácil de transportar" },
        { id: 3, texto: "Ocupa poco espacio" },
        { id: 4, texto: "Adapta la intensidad" },
      ],
    });
    renderPagina();
    expect(await screen.findByText("Recargable por USB")).toBeInTheDocument();
    expect(screen.getByText("Fácil de transportar")).toBeInTheDocument();
    expect(screen.getByText("Ocupa poco espacio")).toBeInTheDocument();
    expect(screen.queryByText("Adapta la intensidad")).not.toBeInTheDocument();
  });

  it("no muestra ningún beneficio rápido cuando la lista está vacía", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE, beneficios: [] });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);
    expect(screen.queryByText("Recargable por USB")).not.toBeInTheDocument();
  });

  it("muestra los items de usos dentro de ¿Qué problema resuelve? cuando hay usos cargados", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      usos: [{ id: 1, texto: "Para estudiar" }, { id: 2, texto: "Para viajar" }],
    });
    renderPagina();
    expect(await screen.findByText("¿Qué problema resuelve?")).toBeInTheDocument();
    expect(screen.getByText("Para estudiar")).toBeInTheDocument();
    expect(screen.getByText("Para viajar")).toBeInTheDocument();
  });

  it("muestra Ideal para solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      idealPara: [{ id: 1, texto: "Estudiantes" }],
    });
    renderPagina();
    expect(await screen.findByText("Ideal para")).toBeInTheDocument();
    expect(screen.getByText("Estudiantes")).toBeInTheDocument();
  });

  it("muestra Especificaciones técnicas como tabla nombre/valor dentro de Ficha técnica cuando existen", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      especificaciones: [{ id: 1, nombre: "Material", valor: "ABS" }],
    });
    renderPagina();
    expect(await screen.findByText("Ficha técnica")).toBeInTheDocument();
    expect(screen.getByText("Especificaciones técnicas")).toBeInTheDocument();
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByText("ABS")).toBeInTheDocument();
  });

  it("muestra Incluye solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      incluye: [{ id: 1, texto: "1 × Cable USB" }],
    });
    renderPagina();
    expect(await screen.findByText("Incluye")).toBeInTheDocument();
    expect(screen.getByText("1 × Cable USB")).toBeInTheDocument();
  });

  it("un producto sin ningún campo comercial nuevo no muestra ninguna de las secciones nuevas", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);

    expect(screen.queryByText("¿Por qué lo vas a querer?")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Qué problema resuelve?")).not.toBeInTheDocument();
    expect(screen.queryByText("Ideal para")).not.toBeInTheDocument();
    expect(screen.queryByText("Ficha técnica")).not.toBeInTheDocument();
    expect(screen.queryByText("Incluye")).not.toBeInTheDocument();
  });
});

describe("ProductoDetalle — video en la galería", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un thumbnail de video en la galería cuando el producto tiene video", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      fotos: [{ id: 1, url: "/foto1.jpg", orden: 0 }],
      video: { id: 1, url: "/api/products/1/video" },
    });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);
    expect(screen.getByRole("button", { name: "Ver video" })).toBeInTheDocument();
  });

  it("no muestra la fila de thumbnails cuando el producto tiene una sola foto y no tiene video", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      fotos: [{ id: 1, url: "/foto1.jpg", orden: 0 }],
      video: null,
    });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);
    expect(screen.queryByRole("button", { name: "Ver video" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver foto 1" })).not.toBeInTheDocument();
  });
});

describe("ProductoDetalle — CTA sticky mobile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra una barra sticky inferior con precio y Agregar al carrito", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);

    const barrasSticky = screen.getAllByTestId("cta-sticky-mobile");
    expect(barrasSticky).toHaveLength(1);
  });

  it("el CTA sticky permite agregar al carrito", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);

    const barraSticky = screen.getByTestId("cta-sticky-mobile");
    const boton = within(barraSticky).getByRole("button", { name: /Agregar/i });
    fireEvent.click(boton);

    expect(await within(barraSticky).findByText(/Agregado/i)).toBeInTheDocument();
  });

  it("se oculta (translate-y-full) cuando el centinela de fin de página entra en pantalla", async () => {
    const observeSpy = vi.fn();
    const instancias = [];
    vi.spyOn(global, "IntersectionObserver").mockImplementation(function (callback) {
      this.callback = callback;
      this.observe = observeSpy;
      this.disconnect = vi.fn();
      instancias.push(this);
    });

    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);

    const barraSticky = screen.getByTestId("cta-sticky-mobile");
    expect(barraSticky.className).toContain("translate-y-0");

    // El observer lo instancia un efecto de FichaProducto DESPUÉS del primer
    // render: bajo carga, asumir `instancias[0]` acá corría antes de ese
    // efecto y explotaba con "Cannot read properties of undefined". Se espera
    // a que la instancia exista en vez de asumirla — el test sigue
    // verificando exactamente lo mismo.
    await waitFor(() => expect(instancias.length).toBeGreaterThan(0));

    instancias[0].callback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(screen.getByTestId("cta-sticky-mobile").className).toContain("translate-y-full");
    });

    global.IntersectionObserver.mockRestore();
  });
});

describe("ProductoDetalle — producto no disponible", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirige al catálogo cuando el producto no existe (404: inexistente u oculto; sin stock devuelve 200 y no pasa por acá)", async () => {
    productsApi.getProductById.mockResolvedValue(null);

    renderPagina();

    expect(await screen.findByText("Catálogo (mock)")).toBeInTheDocument();
  });

  it("muestra un toast de error al redirigir por producto no disponible", async () => {
    productsApi.getProductById.mockResolvedValue(null);

    renderPagina();

    expect(await screen.findByText("Este producto ya no está disponible.")).toBeInTheDocument();
  });
});

describe("ProductoDetalle - fallo de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un error y apaga el spinner si no se puede cargar el producto", async () => {
    productsApi.getProductById.mockRejectedValue(new Error("network down"));

    renderPagina();

    expect(
      await screen.findByText(/No pudimos cargar el producto/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando producto…")).not.toBeInTheDocument();
    // Un fallo de conexión no es un producto inexistente: no se redirige.
    expect(screen.queryByText("Catálogo (mock)")).not.toBeInTheDocument();
  });
});
