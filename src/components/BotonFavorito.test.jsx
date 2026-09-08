import { render, screen } from "@testing-library/react";
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

  it("la variante con texto también llega a 44 de alto", () => {
    render(<BotonFavorito productoId={1} textoGuardar="Guardar" />);

    const boton = screen.getByRole("button", { name: "Agregar a favoritos" });
    expect(boton.className).toContain("before:content-['']");
    expect(boton.className).toContain("before:h-11");
  });
});
