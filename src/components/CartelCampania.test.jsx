import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import CartelCampania from "./CartelCampania.jsx";

/**
 * `CartelCampania` es la CARD sola: el arte, el título, el texto con su
 * contador y el CTA. La cáscara de diálogo (velo, foco, Escape, botón cerrar)
 * vive en `ModalCampania`, que lo envuelve.
 *
 * Existe separado porque el panel de campañas necesita mostrar exactamente el
 * mismo cartel como VISTA PREVIA, y ahí el CTA no debe navegar: para eso está
 * `interactivo={false}`.
 */

const BASE = {
  campaniaId: 1,
  titulo: "Llega la primavera",
  texto: "Faltan {dias} días.",
  diasFaltantes: 6,
  ctaTexto: "Ver más",
  ctaDestino: "/coleccion?campania=1",
  doodleUrl: null,
};

function montar(extra = {}, props = {}) {
  return render(
    <MemoryRouter>
      <CartelCampania modal={{ ...BASE, ...extra }} idTitulo="titulo-cartel" {...props} />
    </MemoryRouter>,
  );
}

describe("CartelCampania", () => {
  it("el CTA es un link al destino que manda el backend", () => {
    // El frontend NO arma la ruta: `ctaDestino` llega resuelto (`/coleccion?
    // campania=3`, `/coleccion/categoria/hogar`…). Componer el destino acá
    // sería un espejo de una regla que el backend ya tiene.
    montar();

    const cta = screen.getByRole("link", { name: "Ver más" });
    expect(cta).toHaveAttribute("href", "/coleccion?campania=1");
  });

  it("sin destino no hay link", () => {
    // Una campaña puede ser puro anuncio, sin ningún lado al que mandar.
    montar({ ctaDestino: null });

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("interactivo={false} pinta el CTA sin link, pero conserva el texto", () => {
    // Es la vista previa del panel: el botón tiene que verse igual que en el
    // catálogo y no puede sacar al admin de la pantalla en la que está
    // editando.
    montar({}, { interactivo: false });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Ver más")).toBeInTheDocument();
  });

  it("el contador va resaltado en un <strong>", () => {
    // `texto` llega crudo con el marcador `{dias}` y el backend manda
    // `diasFaltantes` ya resuelto: acá solo se sustituye, porque el número va
    // pintado aparte. El cálculo del día nunca sale del backend.
    const { container } = montar();

    const contador = container.querySelector("strong");
    expect(contador).toHaveTextContent("6");
  });

  it("sin Doodle no pinta ninguna imagen", () => {
    // Una campaña sin arte no cae en el wordmark de siempre: el cartel no es
    // el encabezado del sitio, y la marca ya está arriba.
    const { container } = montar({ doodleUrl: null });

    expect(container.querySelector("img")).toBeNull();
  });

  it("con Doodle pinta el arte de ESA campaña", () => {
    const { container } = montar({ doodleUrl: "https://res.cloudinary.com/demo/primavera.png" });

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "https://res.cloudinary.com/demo/primavera.png",
    );
  });
});
