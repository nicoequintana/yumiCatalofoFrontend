import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import VeloModal from "./VeloModal.jsx";

afterEach(() => {
  document.body.style.overflow = "";
});

describe("VeloModal", () => {
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
