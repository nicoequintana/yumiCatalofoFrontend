import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PreviewCartel from "./PreviewCartel.jsx";

const MODAL = {
  titulo: "Un título largo que ocupa dos renglones bien holgados",
  texto: "Faltan {dias} días y este texto es deliberadamente extenso para estirar la tarjeta.",
  diasFaltantes: 17,
  ctaTexto: "Ver más",
  ctaDestino: "/coleccion",
  doodleUrl: null,
};

/**
 * Guard del CONTENEDOR, no del contenido.
 *
 * El cartel es de alto variable: el título, el texto y el arte los escribe el
 * admin. Si el ALTO del panel lo define el esqueleto del fondo y la tarjeta va
 * `absolute` encima, un cartel más alto que ese fondo se recorta contra el
 * `overflow-hidden` — y lo primero que se pierde es el botón, que es el final
 * de la tarjeta. Así se veía cortado el "Ver más".
 *
 * La tarjeta tiene que ir EN FLUJO (es la que manda el alto) y el fondo
 * detrás, en `absolute`. jsdom no pinta, así que se afirma sobre el markup del
 * que ese CSS depende — mismo criterio que `esperarTablaApilada`.
 */
describe("PreviewCartel", () => {
  it("la tarjeta va en flujo: es ella la que define el alto del panel", () => {
    const { container } = render(<PreviewCartel modal={MODAL} />);

    const panel = container.querySelector('[data-testid="preview-cartel"]');
    // Mirar solo el div de la tarjeta no probaria nada: el `absolute` que
    // recortaba estaba en un ANCESTRO. Se recorre la cadena hasta el panel.
    let nodo = screen.getByText(MODAL.titulo);
    const cadena = [];
    while (nodo && nodo !== panel) {
      cadena.push(String(nodo.className ?? ""));
      nodo = nodo.parentElement;
    }

    expect(cadena.join(" ")).not.toContain("absolute");
  });

  it("el fondo y el velo van detrás, en absolute, y no empujan el alto", () => {
    const { container } = render(<PreviewCartel modal={MODAL} />);

    const panel = container.querySelector('[data-testid="preview-cartel"]');
    const decorativos = [...panel.querySelectorAll('[aria-hidden="true"]')].filter((el) =>
      el.className.includes("inset-0"),
    );

    expect(decorativos.length).toBeGreaterThanOrEqual(2);
    for (const el of decorativos) expect(el.className).toMatch(/\babsolute\b/);
  });

  it("el panel no fija un alto propio, que es lo que recortaba el botón", () => {
    const { container } = render(<PreviewCartel modal={MODAL} />);

    const panel = container.querySelector('[data-testid="preview-cartel"]');
    expect(panel.className).not.toMatch(/\bh-\[|\bh-\d|\bmax-h-/);
  });
});
