import { render, screen } from "@testing-library/react";
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
