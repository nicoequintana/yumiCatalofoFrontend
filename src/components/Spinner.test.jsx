import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Spinner from "./Spinner.jsx";

/**
 * El spinner se anuncia solo — salvo cuando algo de al lado ya lo hace.
 *
 * Suelto (llenando una pantalla mientras carga) su `role="status"` y su
 * `aria-label="Cargando"` son lo único que le dice a un lector de pantalla que
 * hay algo en curso: ahí son imprescindibles.
 *
 * Dentro de un `<button>` que además tiene texto, en cambio, el nombre
 * accesible del botón se arma CONCATENANDO todo lo que hay adentro. El rótulo
 * del spinner no reemplaza al texto: se le suma, y el botón termina
 * anunciándose como "CargandoGuardando…". Para ese caso está `decorativo`.
 */
describe("Spinner", () => {
  it("suelto, se anuncia como cargando", () => {
    render(<Spinner />);

    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
  });

  it("con `decorativo`, no aporta nada al nombre accesible de quien lo contiene", () => {
    render(
      <button type="button">
        <Spinner decorativo />
        Guardando…
      </button>,
    );

    // Sin `decorativo` esto diría "CargandoGuardando…".
    expect(screen.getByRole("button")).toHaveAccessibleName("Guardando…");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("el default NO es decorativo: los 25 usos existentes no cambian", () => {
    // Si el default fuera `true`, cada spinner que hoy llena una pantalla
    // mientras carga dejaría de anunciarse, en silencio.
    render(<Spinner />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Cargando");
  });
});
