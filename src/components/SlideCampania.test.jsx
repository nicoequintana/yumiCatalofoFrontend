import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SlideCampania from "./SlideCampania.jsx";

const SLIDE = {
  tipo: "CAMPANIA",
  campaniaId: 7,
  titulo: "Primavera YIMA",
  texto: "Renovamos la casa",
  ctaTexto: "Ver la selección",
  ctaDestino: "/coleccion?campania=7",
  arteUrl: null,
  doodleUrl: "https://cdn.test/doodle.png",
  color: "VERDE",
};

function renderSlide(slide, props) {
  return render(
    <MemoryRouter>
      <SlideCampania slide={slide} {...props} />
    </MemoryRouter>,
  );
}

describe("SlideCampania", () => {
  it("sin arte, pinta el color y muestra el doodle", () => {
    const { container } = renderSlide(SLIDE);

    expect(screen.getByText("Primavera YIMA")).toBeInTheDocument();
    // Decorativa (`alt=""`): no tiene rol "img" en el árbol de accesibilidad,
    // así que se busca por el DOM, no por rol.
    expect(container.querySelector("img")).toHaveAttribute("src", SLIDE.doodleUrl);
    expect(container.querySelector(".bg-secondary")).not.toBeNull();
  });

  it("con arte, la pieza llena la caja y el doodle NO se muestra", () => {
    // Dos imágenes en 135 px de alto es ruido: con arte, el doodle sobra.
    const { container } = renderSlide({ ...SLIDE, arteUrl: "https://cdn.test/arte.jpg" });

    // Decorativas (`alt=""`): sin rol "img", se cuentan por el DOM.
    const imagenes = container.querySelectorAll("img");
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]).toHaveAttribute("src", "https://cdn.test/arte.jpg");
  });

  it("el arte va absolute inset-0", () => {
    // En flujo normal el alto porcentual no resuelve contra `aspect-ratio` y la
    // caja toma el ratio del archivo, estirando el carrusel entero.
    const { container } = renderSlide({ ...SLIDE, arteUrl: "https://cdn.test/arte.jpg" });

    // Decorativa (`alt=""`): sin rol "img", se busca por el DOM.
    const arte = container.querySelector("img");
    expect(arte.className).toContain("absolute");
    expect(arte.className).toContain("inset-0");
  });

  it("un color desconocido cae al de la marca en vez de romper", () => {
    const { container } = renderSlide({ ...SLIDE, color: "FUCSIA" });

    expect(container.querySelector(".bg-primary")).not.toBeNull();
  });

  it("el CTA es un link cuando hay destino y texto", () => {
    renderSlide(SLIDE);

    expect(screen.getByRole("link", { name: "Ver la selección" })).toHaveAttribute(
      "href",
      "/coleccion?campania=7",
    );
  });

  it("sin destino no hay botón", () => {
    // Sin `ctaTexto` el backend ya no manda destino: dibujar un botón que no
    // lleva a ningún lado es peor que no dibujar ninguno.
    renderSlide({ ...SLIDE, ctaTexto: null, ctaDestino: null });

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("interactivo={false} dibuja el CTA sin navegar", () => {
    // La vista previa del panel: el botón se ve, pero no es un link.
    renderSlide(SLIDE, { interactivo: false });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Ver la selección")).toBeInTheDocument();
  });

  it("las imágenes son decorativas: el título no se anuncia dos veces", () => {
    // El título ya está como texto al lado de la imagen. Un `alt` con el mismo
    // texto se lo hace leer dos veces seguidas a un lector de pantalla.
    const { container } = renderSlide({ ...SLIDE, arteUrl: "https://cdn.test/arte.jpg" });

    for (const img of container.querySelectorAll("img")) {
      expect(img).toHaveAttribute("alt", "");
    }
  });
});
