import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SeccionCampania from "./SeccionCampania.jsx";

/**
 * Guard de accesibilidad del bloque del Doodle, no del componente entero: el
 * resto de las decisiones de esta sección viven en su propio doc-block.
 *
 * ⚠️ **Esta pantalla se le escapó ENTERA al barrido de la auditoría táctil del
 * 07/09/2026.** El editor de campaña es una RUTA propia
 * (`/catalogo/admin/campanias/:id/editar`) a la que "Nueva campaña" NAVEGA, así
 * que el recorrido de `/catalogo/admin/campanias` nunca llegaba; y el bloque del
 * Doodle solo se renderiza en modo EDICIÓN, porque sube a `PUT /:id/doodle` y no
 * hay id hasta que la campaña exista.
 */

const VALORES = {
  nombre: "Primavera",
  tipo: "ESTACIONAL",
  estado: "HABILITADA",
  prioridad: "1",
  desde: "2026-09-01",
  hasta: "2026-09-30",
  doodleEnCatalogo: true,
  doodleEnAdmin: false,
  descripcion: "",
};

const OPCIONES = {
  tipos: [{ valor: "ESTACIONAL", etiqueta: "Estacional" }],
  estados: [{ valor: "HABILITADA", etiqueta: "Habilitada" }],
};

function montar(props = {}) {
  return render(
    <SeccionCampania
      valores={VALORES}
      editar={vi.fn()}
      opciones={OPCIONES}
      esEdicion={false}
      campania={null}
      guardando={false}
      onSubirDoodle={vi.fn()}
      onQuitarDoodle={vi.fn()}
      {...props}
    />,
  );
}

describe("SeccionCampania — el input de archivo del Doodle tiene nombre accesible", () => {
  // El `<input type="file">` va `sr-only` y se dispara desde el botón de al lado
  // con un `.click()` por ref, así que NO está envuelto por ningún `<label>`:
  // sin nombre propio, para un lector de pantalla es un control mudo ("file
  // upload button", sin decir de qué). La auditoría del 07/09/2026 lo encontró
  // como el único input sin label de la pantalla. Se nombra igual que su gemelo
  // de `SeccionBanner`, que ya lo hacía bien.
  it("se llama «Subir Doodle» cuando la campaña todavía no tiene uno", () => {
    montar({ esEdicion: true, campania: { id: 1, nombre: "Primavera" } });

    expect(screen.getByLabelText("Subir Doodle")).toHaveAttribute("type", "file");
  });

  it("se llama «Reemplazar Doodle» cuando ya hay uno guardado", () => {
    montar({
      esEdicion: true,
      campania: { id: 1, nombre: "Primavera", doodleUrl: "https://cdn/doodle.png" },
    });

    expect(screen.getByLabelText("Reemplazar Doodle")).toHaveAttribute("type", "file");
  });
});

/**
 * Medido en navegador el 07/09/2026 a 1280×800 sobre
 * `/catalogo/admin/campanias/1054/editar`, con `elementFromPoint` —el área
 * EFECTIVA, no la caja declarada—: "Reemplazar" daba 93×33 y "Quitar" 86×33,
 * contra el mínimo de 44×44 de WCAG 2.5.8. El ancho ya sobraba; faltaba el ALTO.
 *
 * jsdom no hace layout: acá se afirma sobre la CLASE declarada.
 */
describe("SeccionCampania — área táctil (44px)", () => {
  it.each([["Reemplazar"], ["Quitar"]])(
    "«%s» declara el mínimo táctil de 44px de alto",
    (nombre) => {
      montar({
        esEdicion: true,
        campania: { id: 1, nombre: "Primavera", doodleUrl: "https://cdn/doodle.png" },
      });

      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" ")).toContain("min-h-11");
    },
  );

  it("«Subir Doodle» declara el mínimo táctil de 44px de alto", () => {
    montar({ esEdicion: true, campania: { id: 1, nombre: "Primavera" } });

    const boton = screen.getByRole("button", { name: "Subir Doodle" });
    expect(boton.className.split(" ")).toContain("min-h-11");
  });
});
