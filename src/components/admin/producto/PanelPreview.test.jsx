import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PanelPreview from "./PanelPreview.jsx";

const PRODUCTO = { nombre: "Producto de prueba", precio: "1000", stock: 5 };

function montar(extra = {}) {
  return render(
    <PanelPreview
      producto={PRODUCTO}
      visible
      plantillaCompleta={false}
      onAlternarPlantilla={() => {}}
      anchoPreview="desktop"
      onCambiarAncho={() => {}}
      {...extra}
    />,
  );
}

describe("PanelPreview", () => {
  it("el selector escritorio/móvil solo existe desde lg", () => {
    montar();

    // Por debajo de `lg` el preview ocupa toda la columna como pestaña —
    // alternar "ancho escritorio/móvil" no tiene sentido ahí, solo sirve
    // cuando el preview convive al lado del formulario.
    const botonEscritorio = screen.getByRole("button", { name: "Vista escritorio" });
    const contenedor = botonEscritorio.closest("div");

    expect(contenedor).toHaveClass("hidden");
    expect(contenedor).toHaveClass("lg:flex");
  });

  describe("área táctil (WCAG 2.5.8)", () => {
    it("«Ver como cliente» llega a 44 de alto sin perder su tamaño visible", () => {
      // Medido en navegador el 07/09/2026 a 1280px con `elementFromPoint`
      // (área EFECTIVA, no la caja declarada): 93x31 de área sobre una caja de
      // 184x30. El `py-1.5` se conserva: el mínimo táctil es un PISO y la
      // variante sigue decidiendo el aire alrededor del texto.
      // Con `plantillaCompleta` el botón dice "Ver como cliente", que es el
      // estado en el que se midió; el otro rótulo ("Ver plantilla") es el
      // mismo botón y comparte las clases.
      montar({ plantillaCompleta: true });

      const boton = screen.getByRole("button", { name: /ver como cliente/i });

      expect(boton.className).toContain("min-h-11");
      expect(boton.className).toContain("py-1.5");
    });

    it("el conmutador escritorio/móvil crece de verdad, no con pseudo-elemento", () => {
      // Medido el 07/09/2026 a 1280px: 34x27 de área efectiva sobre una caja
      // de 34x26 cada uno. Son dos botones PEGADOS dentro del mismo riel, así
      // que la incantación de `AREA_TACTIL` no sirve acá: dos pseudo-elementos
      // de 44 centrados a 38px de paso se superponen, y el segundo —que se
      // pinta después— le roba al primero la mitad de su área. La única salida
      // es agrandar la caja real.
      montar();

      const escritorio = screen.getByRole("button", { name: "Vista escritorio" });
      const movil = screen.getByRole("button", { name: "Vista móvil" });

      for (const boton of [escritorio, movil]) {
        expect(boton.className).toContain("size-11");
        expect(boton.className).not.toContain("before:h-11");
      }

      // El paso resultante: 44 de caja + el `gap-1` (4px) del riel = 48px de
      // centro a centro, por encima de los 44 exigidos. Si el gap se sacara,
      // el paso caería a 44 justo — que sigue cumpliendo, pero sin margen.
      expect(escritorio.parentElement).toHaveClass("gap-1");
      expect(escritorio.parentElement).toBe(movil.parentElement);
    });
  });
});
