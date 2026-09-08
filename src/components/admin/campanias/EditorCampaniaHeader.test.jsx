import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import EditorCampaniaHeader from "./EditorCampaniaHeader.jsx";

function montar(props = {}) {
  render(
    <MemoryRouter>
      <EditorCampaniaHeader
        // `encendida` NO es una prop: sale de `campania.estado`, y con
        // "HABILITADA" el botón se rotula "Apagar".
        campania={{ nombre: "Primavera", estado: "HABILITADA", productos: [] }}
        esEdicion
        guardando={false}
        onDuplicar={vi.fn()}
        onAlternarEstado={vi.fn()}
        onEliminar={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

/**
 * Área táctil (WCAG 2.5.8) del encabezado del editor de campaña.
 *
 * ⚠️ **Esta pantalla se le escapó entera a la auditoría del 07/09/2026**: el
 * editor de campaña es una RUTA propia (`/catalogo/admin/campanias/nueva`),
 * no un diálogo de la pantalla de campañas — "Nueva campaña" NAVEGA hasta acá.
 * El barrido recorría `/catalogo/admin/campanias` y nunca llegaba.
 *
 * Medido después, en navegador, con `elementFromPoint` —el área EFECTIVA, no
 * la caja declarada—: "Guardar" daba **41 de alto** a 1280 (`py-3` sobre un
 * texto de 14px). "Duplicar", "Apagar/Encender" y "Eliminar" comparten la
 * misma caja `px-5 py-3`, así que arrastraban el mismo déficit; se corrigen
 * los cuatro, porque dejar tres hermanos idénticos en 41 sería cerrar esto a
 * medias.
 *
 * `min-h-11` va ADEMÁS del `py-3`, no en lugar de él: el mínimo táctil es un
 * PISO (mismo criterio que `SelectorCantidad.jsx`).
 */
describe("EditorCampaniaHeader — área táctil", () => {
  it.each(["Guardar", "Duplicar", "Apagar"])(
    'el botón "%s" declara el mínimo táctil de 44 de alto',
    (nombre) => {
      montar();

      expect(screen.getByRole("button", { name: nombre }).className.split(" ")).toContain(
        "min-h-11",
      );
    },
  );

  it("el botón de eliminar también llega a 44 de alto", () => {
    montar();

    const eliminar = screen
      .getAllByRole("button")
      .find((b) => /eliminar/i.test(b.textContent || ""));

    expect(eliminar).toBeTruthy();
    expect(eliminar.className.split(" ")).toContain("min-h-11");
  });
});
