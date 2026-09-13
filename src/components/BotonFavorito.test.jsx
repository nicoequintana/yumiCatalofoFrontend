import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BotonFavorito from "./BotonFavorito.jsx";

/**
 * El corazón es el control más chico del catálogo público y aparece en cada
 * tarjeta: 12 en `/coleccion`, 8 en la home, 4 en los relacionados de la ficha.
 *
 * Medido en navegador, el ícono solo daba **34×34** (`p-1.5` + un glifo de
 * 22px), por debajo del mínimo de 44×44. El tamaño VISIBLE no se toca —sobre
 * una tarjeta de 190px un disco de 44px se come la foto—, así que el área se
 * extiende con un pseudo-elemento centrado. jsdom no calcula layout: se afirma
 * sobre las clases que producen esa caja.
 */
describe("BotonFavorito — área táctil", () => {
  it("el corazón sin texto extiende su área a 44×44 sin crecer de tamaño visible", () => {
    render(<BotonFavorito productoId={1} />);

    const boton = screen.getByRole("button", { name: "Agregar a favoritos" });
    // El pseudo-elemento necesita un ancestro posicionado y un `content`, o no
    // se pinta ninguna caja y el área táctil sigue siendo la de siempre.
    expect(boton.className).toContain("relative");
    expect(boton.className).toContain("before:content-['']");
    expect(boton.className).toContain("before:h-11");
    expect(boton.className).toContain("before:w-11");
    // El tamaño visible es el de siempre.
    expect(boton.className).toContain("p-1.5");
  });

});

/**
 * 13/09/2026: en la ficha, "Guardar"/"Guardado" era una píldora con texto que
 * bajaba a un segundo renglón debajo del CTA. Pasó a un círculo de 36px con el
 * corazón solo —vacío sin favorito, lleno con favorito—, del mismo alto que el
 * selector y el botón de agregar compactos. El área táctil llega a 44×44 por
 * pseudo-elemento, igual que ellos.
 */
describe("BotonFavorito — variante circular", () => {
  it("es un círculo de 36px con borde, sin texto, y área táctil de 44×44", () => {
    render(<BotonFavorito productoId={901} circular />);

    const boton = screen.getByRole("button", { name: "Agregar a favoritos" });
    const clases = boton.className.split(" ");
    for (const clase of ["h-9", "w-9", "rounded-full", "border", "before:h-11", "before:w-11", "before:content-['']"]) {
      expect(clases).toContain(clase);
    }
    expect(boton).toHaveTextContent(/^favorite$/);
  });

  it("el corazón va vacío sin favorito y lleno con favorito", () => {
    render(<BotonFavorito productoId={902} circular />);

    const boton = screen.getByRole("button", { name: "Agregar a favoritos" });
    const corazon = () => boton.querySelector(".material-symbols-outlined");
    expect(corazon().style.fontVariationSettings).toBe("");

    fireEvent.click(boton);

    expect(boton).toHaveAttribute("aria-pressed", "true");
    expect(boton).toHaveAccessibleName("Quitar de favoritos");
    expect(corazon().style.fontVariationSettings).toContain("'FILL' 1");

    // Deja el estado module-level como estaba para el resto del archivo.
    fireEvent.click(boton);
  });
});
