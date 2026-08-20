import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PhotoGallery from "./PhotoGallery.jsx";

const FOTOS = [
  { id: 1, url: "/uno.jpg", orden: 0 },
  { id: 2, url: "/dos.jpg", orden: 1 },
  { id: 3, url: "/tres.jpg", orden: 2 },
];

function principal(container) {
  // El slide grande es el primer <img> del contenedor de arriba, antes de la
  // fila de miniaturas.
  return container.querySelector(".aspect-square img, .aspect-square video");
}

describe("PhotoGallery", () => {
  it("muestra la primera foto por defecto", () => {
    const { container } = render(<PhotoGallery fotos={FOTOS} nombre="Producto" />);
    expect(principal(container)).toHaveAttribute("src", "/uno.jpg");
  });

  it("cambia el slide grande al tocar una miniatura", async () => {
    const { container } = render(<PhotoGallery fotos={FOTOS} nombre="Producto" />);

    fireEvent.click(screen.getByRole("button", { name: "Ver foto 3" }));

    expect(principal(container)).toHaveAttribute("src", "/tres.jpg");
  });

  it("no muestra miniaturas con una sola foto y sin video", () => {
    render(<PhotoGallery fotos={[FOTOS[0]]} nombre="Producto" />);
    expect(screen.queryByRole("button", { name: /Ver foto/ })).not.toBeInTheDocument();
  });
});

describe("PhotoGallery — la lista de fotos cambia debajo", () => {
  it("no queda en blanco si desaparece la foto seleccionada", () => {
    // Alcanzable desde el editor del admin: elegís la 3ra en la vista previa y
    // después la borrás en el formulario. Antes, `activo` seguía en 2 y el
    // slide grande se renderizaba vacío.
    const { container, rerender } = render(<PhotoGallery fotos={FOTOS} nombre="Producto" />);

    fireEvent.click(screen.getByRole("button", { name: "Ver foto 3" }));
    expect(principal(container)).toHaveAttribute("src", "/tres.jpg");

    rerender(<PhotoGallery fotos={FOTOS.slice(0, 2)} nombre="Producto" />);

    const slide = principal(container);
    expect(slide).not.toBeNull();
    expect(slide).toHaveAttribute("src", "/dos.jpg");
  });

  it("tolera quedarse sin fotos sin romper", () => {
    const { container, rerender } = render(<PhotoGallery fotos={FOTOS} nombre="Producto" />);
    fireEvent.click(screen.getByRole("button", { name: "Ver foto 3" }));

    expect(() => rerender(<PhotoGallery fotos={[]} nombre="Producto" />)).not.toThrow();
    expect(principal(container)).toBeNull();
  });

  it("marca como activa la miniatura que realmente se está viendo", () => {
    const { rerender } = render(<PhotoGallery fotos={FOTOS} nombre="Producto" />);
    fireEvent.click(screen.getByRole("button", { name: "Ver foto 3" }));

    rerender(<PhotoGallery fotos={FOTOS.slice(0, 2)} nombre="Producto" />);

    // La 2da pasa a ser la última disponible: es la que debe figurar activa.
    expect(screen.getByRole("button", { name: "Ver foto 2" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Ver foto 1" })).toHaveAttribute("aria-current", "false");
  });
});
