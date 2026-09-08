import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DialogoProgramar from "./DialogoProgramar.jsx";

/**
 * Guard del ÁREA TÁCTIL del diálogo de programar una promoción.
 *
 * ⚠️ **Estos controles no los ve un barrido de la pantalla en reposo**: solo
 * existen con el diálogo abierto, así que la medición del 07/09/2026 —que
 * sondeó `/catalogo/admin/campanias` con `elementFromPoint`— no los alcanzó.
 * El agujero de cobertura vale para todo control que dependa de datos
 * cargados o de un diálogo abierto. La caja declarada alcanza igual para
 * saberlo: `py-3` con `text-label-md` da los mismos 43 que dieron MEDIDOS los
 * botones gemelos de la pantalla, y el ícono de cerrar (`p-1` + un glifo de
 * 20px) da ~28×28, la mitad del mínimo de 44×44 (WCAG 2.5.8).
 *
 * jsdom no calcula layout: se afirma sobre las CLASES declaradas, igual que en
 * `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`.
 */

const PROMOCIONES = [{ id: 1, nombre: "Promo TEST", activa: true, cantidadProductos: 3 }];

function renderDialogo() {
  return render(
    <DialogoProgramar
      promociones={PROMOCIONES}
      diaInicial="2026-09-04"
      guardando={false}
      onProgramar={vi.fn()}
      onCerrar={vi.fn()}
    />,
  );
}

describe("DialogoProgramar — área táctil", () => {
  it.each([["Cancelar"], ["Programar"]])("«%s» llega a 44 de alto", (nombre) => {
    renderDialogo();

    const boton = screen.getByRole("button", { name: nombre });
    expect(boton.className.split(" ")).toContain("min-h-11");
  });

  it("«Cerrar» extiende su área a 44×44 sin agrandar el ícono", () => {
    // El ícono no crece: es un glifo de 20px en el encabezado del diálogo, y
    // un disco de 44 al lado del título lo desbalancea. Lo único que tiene
    // cerca es el `<h2>`, que no es un control, así que el área extendida no
    // le roba la suya a nadie.
    renderDialogo();

    const boton = screen.getByRole("button", { name: "Cerrar" });
    expect(boton.className).toContain("relative");
    expect(boton.className).toContain("before:content-['']");
    expect(boton.className).toContain("before:h-11");
    expect(boton.className).toContain("before:w-11");
    // El tamaño visible es el de siempre.
    expect(boton.className).toContain("p-1");
  });
});
