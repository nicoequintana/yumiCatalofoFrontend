import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ModalCampania from "./ModalCampania.jsx";

const BASE = {
  campaniaId: 1,
  titulo: "Llega la primavera",
  texto: "Faltan {dias} días.",
  diasFaltantes: 6,
  ctaTexto: null,
  ctaDestino: null,
  doodleUrl: null,
};

/**
 * Devuelve el `<div role="dialog">`, no lo que devuelve `render`: el velo se
 * monta en `body` (portal de `VeloModal`), así que el contenedor de `render` no
 * lo contiene. Buscar adentro del diálogo es además la afirmación correcta —
 * importa que el arte esté EN el cartel, no en cualquier parte del documento.
 */
function montar(extra = {}) {
  render(
    <MemoryRouter>
      <ModalCampania modal={{ ...BASE, ...extra }} onCerrar={() => {}} />
    </MemoryRouter>,
  );
  return screen.getByRole("dialog");
}

describe("ModalCampania — el Doodle en el encabezado", () => {
  it("pinta el arte de la campaña arriba del título", () => {
    // En el navbar el Doodle mide 28px de alto y compite con el resto de la
    // barra. El cartel es el único lugar donde se puede ver de verdad, y es
    // además lo que le da identidad a la interrupción.
    const dialogo = montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    const imagen = dialogo.querySelector("img");
    expect(imagen).toHaveAttribute("src", "https://res.cloudinary.com/demo/primavera.png");
  });

  it("el Doodle es DECORATIVO: no repite la marca para un lector de pantalla", () => {
    // El diálogo ya se nombra por su `<h2>`. Un `alt="YIMA"` acá haría que
    // quien lo escucha oiga la marca antes del título, sin ganar nada.
    const dialogo = montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    expect(dialogo.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("sin Doodle no pinta ninguna imagen", () => {
    // Una campaña sin arte no tiene que caer en el wordmark de siempre: el
    // cartel no es el encabezado del sitio, y ahí la marca ya está arriba.
    const dialogo = montar();

    expect(dialogo.querySelector("img")).toBeNull();
  });

  it("sigue resolviendo el contador y el título", () => {
    montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    expect(screen.getByRole("heading", { name: "Llega la primavera" })).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
