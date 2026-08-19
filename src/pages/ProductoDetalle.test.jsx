import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ProductoDetalle from "./ProductoDetalle.jsx";
import * as productsApi from "../api/products.js";

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
      <Routes>
        <Route path="/producto/:id" element={<ProductoDetalle />} />
      </Routes>
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
    const { relacionados, ...sinRelacionados } = PRODUCTO_BASE;
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
    expect(link).toHaveAttribute("href", "/producto/2");
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

  it("muestra ¿Te pasa esto? solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      tePasaEsto: "¿Te pasó no tener enchufe cerca?",
    });
    renderPagina();
    expect(await screen.findByText("¿Te pasa esto?")).toBeInTheDocument();
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

  it("muestra ¿Cómo podés usarlo? con sus items cuando hay usos cargados", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      usos: [{ id: 1, texto: "Para estudiar" }, { id: 2, texto: "Para viajar" }],
    });
    renderPagina();
    expect(await screen.findByText("¿Cómo podés usarlo?")).toBeInTheDocument();
    expect(screen.getByText("Para estudiar")).toBeInTheDocument();
    expect(screen.getByText("Para viajar")).toBeInTheDocument();
  });

  it("muestra Ideal para solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      idealPara: [{ id: 1, texto: "Estudiantes" }],
    });
    renderPagina();
    expect(await screen.findByText("Ideal para...")).toBeInTheDocument();
    expect(screen.getByText("Estudiantes")).toBeInTheDocument();
  });

  it("muestra Especificaciones como tabla nombre/valor cuando existen", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      especificaciones: [{ id: 1, nombre: "Material", valor: "ABS" }],
    });
    renderPagina();
    expect(await screen.findByText("Especificaciones")).toBeInTheDocument();
    expect(screen.getByText("Material")).toBeInTheDocument();
    expect(screen.getByText("ABS")).toBeInTheDocument();
  });

  it("muestra ¿Qué incluye? solo cuando hay contenido", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      incluye: [{ id: 1, texto: "1 × Cable USB" }],
    });
    renderPagina();
    expect(await screen.findByText("¿Qué incluye?")).toBeInTheDocument();
    expect(screen.getByText("1 × Cable USB")).toBeInTheDocument();
  });

  it("un producto sin ningún campo comercial nuevo no muestra ninguna de las secciones nuevas", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);

    expect(screen.queryByText("¿Por qué lo vas a querer?")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Te pasa esto?")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Cómo podés usarlo?")).not.toBeInTheDocument();
    expect(screen.queryByText("Ideal para...")).not.toBeInTheDocument();
    expect(screen.queryByText("Especificaciones")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Qué incluye?")).not.toBeInTheDocument();
  });
});

describe("ProductoDetalle — Miralo en acción", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra la sección Miralo en acción cuando el producto tiene video", async () => {
    productsApi.getProductById.mockResolvedValue({
      ...PRODUCTO_BASE,
      video: { id: 1, url: "/api/products/1/video" },
    });
    renderPagina();
    expect(await screen.findByText("Miralo en acción")).toBeInTheDocument();
  });

  it("no muestra Miralo en acción cuando el producto no tiene video", async () => {
    productsApi.getProductById.mockResolvedValue({ ...PRODUCTO_BASE, video: null });
    renderPagina();
    await screen.findAllByText(PRODUCTO_BASE.nombre);
    expect(screen.queryByText("Miralo en acción")).not.toBeInTheDocument();
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
    const boton = within(barraSticky).getByRole("button", { name: /Agregar al carrito/i });
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

    instancias[0].callback([{ isIntersecting: true }]);

    await waitFor(() => {
      expect(screen.getByTestId("cta-sticky-mobile").className).toContain("translate-y-full");
    });

    global.IntersectionObserver.mockRestore();
  });
});
