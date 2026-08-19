import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductoForm from "./AdminProductoForm.jsx";
import * as productsApi from "../../api/products.js";
import * as categoriasApi from "../../api/categorias.js";

vi.mock("../../api/products.js");
vi.mock("../../api/categorias.js");

function renderForm(ruta = "/catalogo/admin/productos/nuevo") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
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
    expect(screen.getByText("Beneficio existente")).toBeInTheDocument();
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
