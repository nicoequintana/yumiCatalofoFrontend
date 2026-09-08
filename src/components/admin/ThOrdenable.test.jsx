import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ThOrdenable from "./ThOrdenable.jsx";

function renderTh(props = {}) {
  const onOrden = vi.fn();
  render(
    <table>
      <thead>
        <tr>
          <ThOrdenable
            etiqueta="Precio"
            asc="precio-asc"
            desc="precio-desc"
            orden=""
            onOrden={onOrden}
            {...props}
          />
        </tr>
      </thead>
    </table>,
  );
  return { onOrden };
}

/**
 * Área táctil (WCAG 2.5.8). Medido en navegador el 07/09/2026 sobre
 * `/catalogo/admin/productos` y `/catalogo/admin/productos/precios` con
 * `elementFromPoint` —el área EFECTIVA, no la caja declarada—: los seis
 * encabezados ordenables daban **20-21px de alto** (el `th` tiene su `py-2`,
 * pero el botón de adentro es texto pelado).
 *
 * Va con pseudo-elemento y no con `min-h-11`: `min-h-11` estiraría el botón y
 * con él la fila entera del `thead`, que en una tabla de 84 filas es la única
 * fila que no se puede permitir 24px extra de alto sin empujar todo el listado.
 * El pseudo estira el blanco de click y no mueve nada.
 *
 * ⚠️ El overhang vertical del pseudo (44 sobre un botón de 20) cae dentro del
 * `py-2`/`xl:py-3` del propio `th` y del `py-2` de la primera fila de datos:
 * no llega a tapar ningún control de esa fila. Verificado midiendo de nuevo
 * después del cambio.
 */
describe("ThOrdenable — área táctil", () => {
  it("el botón de ordenar extiende su área a 44 de alto", () => {
    renderTh();

    const boton = screen.getByRole("button", { name: "Ordenar por Precio" });

    // `content-['']` no es decorativo: sin él el pseudo-elemento no genera
    // caja y el área táctil sigue siendo la de antes, sin que nada falle.
    expect(boton.className).toContain("before:h-11");
    expect(boton.className).toContain("before:content-['']");
    // El ancho ya sobra: copia el propio para no invadir la columna de al lado.
    expect(boton.className).toContain("before:w-full");
  });

  it("sigue siendo un control solo de escritorio", () => {
    renderTh();

    // La tabla apilada esconde el `thead`: un control real dentro de un thead
    // recortado a 1px recibe foco invisible.
    expect(screen.getByRole("button", { name: "Ordenar por Precio" }).className).toContain(
      "max-md:hidden",
    );
  });
});
