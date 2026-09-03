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

function montar(extra = {}) {
  return render(
    <MemoryRouter>
      <ModalCampania modal={{ ...BASE, ...extra }} onCerrar={() => {}} />
    </MemoryRouter>,
  );
}

describe("ModalCampania — el Doodle en el encabezado", () => {
  it("pinta el arte de la campaña arriba del título", () => {
    // En el navbar el Doodle mide 28px de alto y compite con el resto de la
    // barra. El cartel es el único lugar donde se puede ver de verdad, y es
    // además lo que le da identidad a la interrupción.
    const { container } = montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    const imagen = container.querySelector("img");
    expect(imagen).toHaveAttribute("src", "https://res.cloudinary.com/demo/primavera.png");
  });

  it("el Doodle es DECORATIVO: no repite la marca para un lector de pantalla", () => {
    // El diálogo ya se nombra por su `<h2>`. Un `alt="YIMA"` acá haría que
    // quien lo escucha oiga la marca antes del título, sin ganar nada.
    const { container } = montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("sin Doodle no pinta ninguna imagen", () => {
    // Una campaña sin arte no tiene que caer en el wordmark de siempre: el
    // cartel no es el encabezado del sitio, y ahí la marca ya está arriba.
    const { container } = montar();

    expect(container.querySelector("img")).toBeNull();
  });

  it("sigue resolviendo el contador y el título", () => {
    montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    expect(screen.getByRole("heading", { name: "Llega la primavera" })).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
