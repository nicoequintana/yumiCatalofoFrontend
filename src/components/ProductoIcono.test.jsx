import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import ProductoIcono from "./ProductoIcono.jsx";

function Proveedores({ children }) {
  return (
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  );
}

/** Forma del detalle público que devuelve `GET /config/home` (T5). */
function productoIconoDePrueba(extra = {}) {
  return {
    id: 7,
    nombre: "Masajeador Cervical Térmico",
    precio: "86650",
    precioEfectivo: null,
    descuento: null,
    stock: 10,
    esNuevo: false,
    fraseComercial: "Alivio para el cuello en diez minutos de sillón.",
    porQueLoVasAQuerer: "Cabezales que giran en los dos sentidos y calor seco focalizado.",
    especificaciones: [
      { id: 1, nombre: "Intensidad regulable", valor: "3 modos" },
      { id: 2, nombre: "Calor seco relajante", valor: "42 °C" },
      { id: 3, nombre: "Batería", valor: "2000 mAh" },
    ],
    fotos: [{ id: 1, url: "https://cdn/masajeador.jpg" }],
    ...extra,
  };
}

function renderIcono(producto) {
  return render(<ProductoIcono producto={producto} />, { wrapper: Proveedores });
}

describe("ProductoIcono", () => {
  it("sin producto elegido no renderiza nada", () => {
    const { container } = renderIcono(null);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  // Guard de caracterización: sin foto NO queda una caja oscura vacía. Es el
  // mismo criterio del resto del sitio (ProductCard no inventa placeholder):
  // sin portada, el bloque de imagen no se dibuja y el texto ocupa la banda.
  it("sin fotos no dibuja la caja de imagen vacía", () => {
    const { container } = renderIcono(productoIconoDePrueba({ fotos: [] }));

    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector(".aspect-\\[4\\/3\\]")).toBeNull();
  });

  it("todo sale del producto: título, párrafo, dos specs, imagen, precio", () => {
    const producto = productoIconoDePrueba();

    renderIcono(producto);

    expect(screen.getByRole("heading", { level: 2, name: producto.fraseComercial })).toBeInTheDocument();
    expect(screen.getByText(producto.nombre)).toBeInTheDocument();
    expect(screen.getByText(producto.porQueLoVasAQuerer)).toBeInTheDocument();
    expect(screen.getByText(producto.especificaciones[0].nombre)).toBeInTheDocument();
    expect(screen.getByText(producto.especificaciones[0].valor)).toBeInTheDocument();
    expect(screen.getByText(producto.especificaciones[1].nombre)).toBeInTheDocument();
    expect(screen.queryByText(producto.especificaciones[2].nombre)).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: producto.nombre })).toHaveAttribute("src", "https://cdn/masajeador.jpg");
    expect(screen.getByText("$ 86.650")).toBeInTheDocument();
  });

  it("el precio y el descuento salen resueltos del backend", () => {
    renderIcono(productoIconoDePrueba({ precioEfectivo: "64990", descuento: { porcentaje: 25 } }));

    expect(screen.getByText("$ 64.990")).toBeInTheDocument();
    expect(screen.getByText("$ 86.650")).toBeInTheDocument();
    expect(screen.getByText("25% OFF")).toBeInTheDocument();
  });

  it("sin frase comercial, el título es el nombre y no se repite", () => {
    const producto = productoIconoDePrueba({ fraseComercial: null, porQueLoVasAQuerer: null, especificaciones: [] });

    renderIcono(producto);

    expect(screen.getByRole("heading", { level: 2, name: producto.nombre })).toBeInTheDocument();
    expect(screen.getAllByText(producto.nombre)).toHaveLength(1);
  });

  it("últimas N unidades con el mismo umbral que el resto del sitio (stock <= 3)", () => {
    renderIcono(productoIconoDePrueba({ stock: 2 }));

    expect(screen.getByText(/últimas 2 unidades/i)).toBeInTheDocument();
  });

  it("con una sola unidad lo dice en singular", () => {
    renderIcono(productoIconoDePrueba({ stock: 1 }));

    expect(screen.getByText(/última unidad/i)).toBeInTheDocument();
  });

  it("con más de 3 unidades no muestra el aviso de stock", () => {
    renderIcono(productoIconoDePrueba({ stock: 4 }));

    expect(screen.queryByText(/últimas? (\d+ )?unidad/i)).not.toBeInTheDocument();
  });

  it("CTA Ver producto + Agregar", () => {
    const producto = productoIconoDePrueba();

    renderIcono(producto);

    expect(screen.getByRole("link", { name: /ver producto/i })).toHaveAttribute(
      "href",
      "/producto/7-masajeador-cervical-termico",
    );
    expect(screen.getByRole("button", { name: /agregar/i })).toBeInTheDocument();
  });

  it("no muestra el lugar de garantía: no hay dato", () => {
    renderIcono(productoIconoDePrueba());

    expect(screen.queryByText(/garantía/i)).not.toBeInTheDocument();
  });
});
