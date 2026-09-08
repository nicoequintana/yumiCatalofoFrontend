import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DialogoCampania from "./DialogoCampania.jsx";

/**
 * Guard del CONTENEDOR del diálogo, no de su contenido.
 *
 * Los dos casos que verifica son los dos que rompieron en el navegador con el
 * formulario de campaña, que es el más alto del panel. Ninguno de los dos lo
 * puede atrapar un test de comportamiento: son de pintado, y jsdom no pinta.
 * Por eso se afirma sobre el MARKUP del que ese CSS depende — el mismo criterio
 * que `esperarTablaApilada` y que el gotcha de `inert`.
 */
describe("DialogoCampania", () => {
  it("se monta FUERA del árbol que lo invoca", () => {
    // El panel envuelve su contenido en un `relative z-10`, que es un contexto
    // de apilamiento. Adentro de ese contexto, la capa efectiva del diálogo es
    // 10 — y la bottom nav de escritorio, que vive en la raíz con `z-40`, se
    // pintaba ENCIMA, tapando los botones de guardar. Portal a `body` es lo que
    // pone al diálogo a competir contra la nav en igualdad.
    const { container } = render(
      <div className="relative z-10">
        <DialogoCampania titulo="Nueva campaña" onCerrar={() => {}}>
          <p>contenido</p>
        </DialogoCampania>
      </div>,
    );

    const dialogo = screen.getByRole("dialog");
    expect(container).not.toContainElement(dialogo);
    expect(document.body).toContainElement(dialogo);
  });

  it("el velo scrollea y el panel se centra SIN margen automático", () => {
    // `my-auto` dentro de un contenedor con scroll reparte también el espacio
    // NEGATIVO: cuando el contenido es más alto que la ventana, el panel se
    // desborda por arriba y esa parte queda inalcanzable — no hay scroll hacia
    // arriba del origen. Por eso el encabezado del diálogo no se veía.
    // El reemplazo es un envoltorio `min-h-full` que centra cuando entra y
    // empuja desde arriba cuando no.
    render(
      <DialogoCampania titulo="Nueva campaña" onCerrar={() => {}}>
        <p>contenido</p>
      </DialogoCampania>,
    );

    const panel = screen.getByRole("dialog");
    expect(panel.className).not.toMatch(/\bmy-auto\b/);

    const centrador = panel.parentElement;
    expect(centrador).toHaveClass("min-h-full", "items-center");

    const velo = centrador.parentElement;
    expect(velo).toHaveClass("overflow-y-auto");
  });

  it("el ícono de cerrar extiende su área a 44×44 sin agrandar el glifo", () => {
    // ⚠️ Este botón no lo ve un barrido de la pantalla en reposo: solo existe
    // con el diálogo abierto, así que la medición del 07/09/2026 sobre
    // `/catalogo/admin/campanias` no lo alcanzó. La caja declarada alcanza
    // igual: `p-1` sobre un glifo de 20px da ~28×28, la mitad del mínimo de
    // 44×44 (WCAG 2.5.8). El glifo no crece —un disco de 44 al lado del
    // título lo desbalancea— y lo único que tiene cerca es el `<h2>`, que no
    // es un control: el área extendida no le roba la suya a nadie.
    render(
      <DialogoCampania titulo="Nueva campaña" onCerrar={() => {}}>
        <p>contenido</p>
      </DialogoCampania>,
    );

    const cerrar = screen.getByRole("button", { name: "Cerrar" });
    expect(cerrar.className).toContain("relative");
    expect(cerrar.className).toContain("before:content-['']");
    expect(cerrar.className).toContain("before:h-11");
    expect(cerrar.className).toContain("before:w-11");
    expect(cerrar.className).toContain("p-1");
  });

  it("deja lugar para la bottom nav de escritorio", () => {
    // Aun ganando el apilamiento, el panel no debe TERMINAR debajo de la nav:
    // el último botón quedaría contra el borde y se leería como cortado.
    render(
      <DialogoCampania titulo="Nueva campaña" onCerrar={() => {}}>
        <p>contenido</p>
      </DialogoCampania>,
    );

    const velo = screen.getByRole("dialog").parentElement.parentElement;
    expect(velo).toHaveClass("lg:pb-24");
  });
});
