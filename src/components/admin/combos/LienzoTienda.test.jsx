import { afterEach, describe, expect, it } from "vitest";
import { render, waitFor, within } from "@testing-library/react";
import LienzoTienda from "./LienzoTienda.jsx";

async function tiendaDe(container) {
  const marco = container.querySelector("iframe");
  await waitFor(() => expect(marco.contentDocument.body.querySelector(".tema-publico")).not.toBeNull());
  return { marco, doc: marco.contentDocument };
}

afterEach(() => {
  document.head.querySelectorAll("[data-prueba-lienzo]").forEach((nodo) => nodo.remove());
});

describe("LienzoTienda", () => {
  it("pinta los hijos dentro del iframe, con tema-publico e inerte, sin tapar nada con una etiqueta", async () => {
    const { container } = render(
      <LienzoTienda ancho={1280}>
        <p>contenido de la tienda</p>
      </LienzoTienda>,
    );

    const { marco, doc } = await tiendaDe(container);
    const texto = within(doc.body).getByText("contenido de la tienda");
    expect(texto.closest(".tema-publico")).toHaveAttribute("inert");
    expect(marco).toHaveAttribute("width", "1280");
    expect(marco).toHaveAttribute("tabindex", "-1");
    expect(container.textContent).toBe("");
  });

  it("sin tope el documento de la tienda no scrollea; con tope scrollea ADENTRO del iframe (barra fija abajo)", async () => {
    const { container, rerender } = render(
      <LienzoTienda ancho={390}>
        <p>hola</p>
      </LienzoTienda>,
    );
    const { doc } = await tiendaDe(container);
    expect(doc.documentElement.style.overflowY).toBe("hidden");

    rerender(
      <LienzoTienda ancho={390} altoMaximo={700}>
        <p>hola</p>
      </LienzoTienda>,
    );
    await waitFor(() => expect(doc.documentElement.style.overflowY).toBe("auto"));
  });

  it("copia las hojas de estilo del documento al iframe (sin ellas no hay tokens ni fuentes)", async () => {
    const hoja = document.createElement("style");
    hoja.setAttribute("data-prueba-lienzo", "");
    hoja.textContent = ".tema-publico { --color-sello: 207 46 31; }";
    document.head.appendChild(hoja);

    const { container } = render(
      <LienzoTienda ancho={390}>
        <p>hola</p>
      </LienzoTienda>,
    );

    const { doc } = await tiendaDe(container);
    const copias = [...doc.head.querySelectorAll("style")].map((nodo) => nodo.textContent);
    expect(copias).toContain(".tema-publico { --color-sello: 207 46 31; }");
  });
});
