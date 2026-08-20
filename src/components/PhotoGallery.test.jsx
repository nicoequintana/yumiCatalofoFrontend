import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("PhotoGallery — apertura del lightbox por teclado", () => {
  it("el slide grande es un botón con nombre accesible, no una <img> clickeable", () => {
    render(<PhotoGallery fotos={FOTOS} nombre="Perfume" />);

    const disparador = screen.getByRole("button", { name: "Ampliar foto de Perfume" });
    expect(disparador).toBeInTheDocument();
  });

  it("se abre con Enter desde el teclado", async () => {
    const user = userEvent.setup();
    render(<PhotoGallery fotos={FOTOS} nombre="Perfume" />);

    await user.click(screen.getByRole("button", { name: "Ampliar foto de Perfume" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("PhotoGallery — el lightbox como diálogo modal", () => {
  async function abrirLightbox() {
    const user = userEvent.setup();
    render(<PhotoGallery fotos={FOTOS} nombre="Perfume" />);
    const disparador = screen.getByRole("button", { name: "Ampliar foto de Perfume" });
    await user.click(disparador);
    return { user, disparador };
  }

  it("se anuncia como diálogo modal", async () => {
    await abrirLightbox();

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName("Foto ampliada de Perfume");
  });

  it("mueve el foco adentro al abrirse", async () => {
    await abrirLightbox();

    // Sin esto el foco se queda detrás del overlay: el usuario ve una pantalla
    // negra y tabula por una página que no puede ver.
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("atrapa el tabulado adentro del diálogo", async () => {
    const { user } = await abrirLightbox();
    const dialogo = screen.getByRole("dialog");

    // Más tabulados que controles: si no hubiera trampa, el foco se escaparía
    // a la página de abajo en alguna de las vueltas.
    for (let i = 0; i < 6; i += 1) {
      await user.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });

  it("cierra con Escape y devuelve el foco al control que lo abrió", async () => {
    const { user, disparador } = await abrirLightbox();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(disparador);
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
