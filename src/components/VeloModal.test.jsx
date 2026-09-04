import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import VeloModal from "./VeloModal.jsx";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("VeloModal", () => {
  it("se monta en `body`, FUERA del árbol que lo invoca", () => {
    // El panel envuelve su contenido en un `relative z-10`, que es un contexto
    // de apilamiento: adentro, la capa efectiva de cualquier diálogo es 10 por
    // más `z-50` que declare, y la bottom nav de escritorio (`z-40`, en la
    // raíz) se le pinta encima. Subir el z-index no sirve — adentro de un
    // contexto el número no se compara con nada de afuera. Un portal a `body`
    // es lo único que lo saca, y es una propiedad del velo, no de cada pantalla.
    const { container } = render(
      <div className="relative z-10">
        <VeloModal>contenido</VeloModal>
      </div>,
    );

    const velo = screen.getByText("contenido");
    expect(container).not.toContainElement(velo);
    expect(velo.parentElement).toBe(document.body);
  });

  it("desenfoca y oscurece lo que queda atrás", () => {
    render(<VeloModal className="z-50 bg-black/40">contenido</VeloModal>);

    const velo = screen.getByText("contenido");
    expect(velo).toHaveClass("fixed", "inset-0", "backdrop-blur");
    // Las clases de cada pantalla se conservan: el tinte y la capa siguen
    // decidiéndose en el diálogo, solo el desenfoque es compartido.
    expect(velo).toHaveClass("z-50", "bg-black/40");
  });

  it("frena el scroll de atrás mientras está montado", () => {
    // Sin esto, el gesto de scroll sobre el velo mueve la página de abajo: el
    // contenido desenfocado se desplaza detrás del diálogo y la sensación es
    // que el modal se despegó de la pantalla.
    //
    // ⚠️ Se afirma sobre el ESTILO y no sobre `window.scrollY`, y no es
    // conformismo de jsdom: `overflow: hidden` **no frena el scroll
    // programático**, solo el del usuario. Un test que hiciera `scrollBy` y
    // esperara cero fallaría con el bloqueo puesto y andando — verificado en
    // Chromium, donde `scrollBy(0, 400)` mueve la página igual con el modal
    // abierto, y una rueda real no la mueve nada.
    const { unmount } = render(<VeloModal>x</VeloModal>);

    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restaura el overflow que había antes, no uno inventado", () => {
    document.body.style.overflow = "clip";

    const { unmount } = render(<VeloModal>x</VeloModal>);
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("clip");
  });
});
