import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TablaComercial from "./TablaComercial.jsx";

const FILA = {
  id: 21,
  sku: "YIMA-1",
  nombre: "Velador LED",
  categoria: { id: 1, nombre: "Hogar" },
  fotoPortada: null,
  visibleEnCatalogo: true,
  vistas: 120,
  unidadesVendidas: 2,
  conversion: 1.6,
  costo: "8000",
  coeficiente: "2.50",
  precio: "20000",
  promociones: [],
};

function montar(extra = {}) {
  return render(
    <TablaComercial
      filas={[FILA]}
      seleccionados={new Set()}
      onAlternar={vi.fn()}
      guardando={false}
      {...extra}
    />,
  );
}

/**
 * Auditoría de área táctil del 07/09/2026, medida en navegador real con
 * `elementFromPoint` a 1280×800: los 20 checkboxes de la tabla daban **20×21**
 * de área efectiva, menos de la mitad del mínimo de 44×44.
 *
 * Un `<input type="checkbox">` NO acepta `::before` (es un elemento
 * reemplazado), así que el pseudo-elemento de `utils/areaTactil.js` no sirve
 * acá: el área la aporta el `<label>` que lo envuelve, y clickearlo alterna el
 * control por la asociación implícita del propio `<label>`.
 *
 * jsdom no calcula layout: se afirma sobre las CLASES declaradas, mismo
 * criterio que `SelectorCantidad.test.jsx`.
 */
describe("TablaComercial — área táctil del checkbox de fila", () => {
  it("el checkbox va envuelto en un label de 44×44", () => {
    montar();

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Velador LED" });
    const area = checkbox.closest("label");

    expect(area).not.toBeNull();
    const clases = area.className.split(" ");
    expect(clases).toContain("h-11");
    expect(clases).toContain("w-11");
    // El cuadradito visible sigue midiendo 20px: lo que crece es el blanco de
    // click, no el dibujo.
    expect(checkbox.className.split(" ")).toContain("h-5");
    expect(checkbox.className.split(" ")).toContain("w-5");
  });

  it("clickear el área alterna la fila", async () => {
    const onAlternar = vi.fn();
    montar({ onAlternar });

    const checkbox = screen.getByRole("checkbox", { name: "Seleccionar Velador LED" });
    checkbox.closest("label").click();

    expect(onAlternar).toHaveBeenCalledWith(21);
  });

  it("el color del checkbox sigue saliendo del token, no de un hex", () => {
    // `accent-[rgb(var(--color-primary))]` es un valor arbitrario que resuelve
    // al token semántico: agrandar el área táctil no puede cambiarlo por un
    // color literal.
    montar();

    expect(
      screen.getByRole("checkbox", { name: "Seleccionar Velador LED" }).className,
    ).toContain("accent-[rgb(var(--color-primary))]");
  });
});
