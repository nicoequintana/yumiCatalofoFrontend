import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PromocionesDeCampania from "./PromocionesDeCampania.jsx";

/**
 * Área táctil de las filas de promoción.
 *
 * ⚠️ **Esta pantalla se le escapó ENTERA al barrido de la auditoría del
 * 07/09/2026.** El editor de campaña es una RUTA propia
 * (`/catalogo/admin/campanias/:id/editar`) a la que "Nueva campaña" NAVEGA, y
 * esta sección solo se renderiza en modo EDICIÓN — la ruta de alta muestra un
 * cartel en su lugar, así que medía limpio.
 *
 * Medido en navegador a 1280×800 sobre `/catalogo/admin/campanias/1054/editar`
 * con `elementFromPoint` —el área EFECTIVA, no la caja declarada—: la fila daba
 * 43 de alto, contra los 44 de WCAG 2.5.8.
 *
 * El área la lleva el `<label>` y no el `<input type="checkbox">`: un checkbox
 * no acepta `::before`, y el pseudo-elemento de `AREA_TACTIL` no tendría dónde
 * dibujarse. Es área REAL (`min-h-11`), nunca margen negativo: un `-m-3 p-3`
 * declara los 44 pero los saca del flujo y le roba el área a la fila de al lado.
 *
 * jsdom no hace layout: acá se afirma sobre la CLASE declarada.
 */

const PROMOCIONES = [
  { id: 3, nombre: "Invierno", cantidadProductos: 4 },
  { id: 4, nombre: "Liquidación", cantidadProductos: 1 },
];

function montar(props = {}) {
  return render(
    <PromocionesDeCampania
      promociones={PROMOCIONES}
      asociadas={[]}
      guardando={false}
      onGuardar={vi.fn()}
      {...props}
    />,
  );
}

describe("PromocionesDeCampania — área táctil (44px)", () => {
  it("cada fila declara el mínimo táctil de 44px de alto en el label", () => {
    montar();

    for (const promocion of PROMOCIONES) {
      const casilla = screen.getByRole("checkbox", { name: new RegExp(promocion.nombre, "i") });
      const fila = casilla.closest("label");
      expect(fila.className.split(" ")).toContain("min-h-11");
    }
  });
});
