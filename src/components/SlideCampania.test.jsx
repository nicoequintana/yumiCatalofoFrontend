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
    const { container } = renderSlide({
      ...SLIDE,
      arteUrl: "https://cdn.test/arte.jpg",
      doodleUrl: "https://cdn.test/doodle.png",
    });

    // Decorativas (`alt=""`): sin rol "img", se cuentan por el DOM.
    //
    // Este test afirmaba `toHaveLength(1)` hasta el 06/09/2026, y contar dejó
    // de servir: el vidrio es una COPIA desenfocada del arte, así que con arte
    // hay DOS `<img>` del mismo `src`. Lo que el test protege no es el número
    // sino que el doodle no se cuele — así que ahora eso es lo que afirma.
    const imagenes = [...container.querySelectorAll("img")];
    expect(imagenes.length).toBeGreaterThan(0);
    expect(imagenes.every((i) => i.getAttribute("src") === "https://cdn.test/arte.jpg")).toBe(true);
    expect(container.querySelector('img[src="https://cdn.test/doodle.png"]')).toBeNull();
  });

  it("el bloque de texto parte las palabras largas en vez de desbordar", () => {
    // Una palabra sin espacios NO se puede cortar por defecto: el navegador la
    // deja salir de su caja. Con un texto pegado (una URL, un "productosss…"),
    // el copy se iba por encima del arte atravesando el banner entero — el
    // `max-w-[52%]` limita la CAJA, no una palabra indivisible.
    const { container } = renderSlide({
      ...SLIDE,
      arteUrl: "https://cdn.test/arte.jpg",
      texto: `Hasta 30% de descuento en productos${"s".repeat(60)}`,
    });

    const bloque = container.querySelector("div.min-w-0");
    expect(bloque.className).toContain("break-words");
    // El tope de ancho es la otra mitad del par: sin él, partir palabras no
    // alcanza porque la caja crecería igual.
    expect(bloque.className).toContain("max-w-[64%]");
    expect(bloque.className).toContain("md:max-w-[52%]");
  });

  it("con arte, el vidrio es una copia desenfocada y no un backdrop-filter", () => {
    // `backdrop-filter` muestrea el fondo, así que se recalcula en cada frame
    // de la transición de opacidad del carrusel (500 ms, dos slides a la vez):
    // el vidrio se veía llegar tarde. `filter: blur()` sobre una copia se
    // rasteriza una vez. Este guard existe para que nadie lo revierta por
    // "simplificar" a una sola capa.
    const { container } = renderSlide({ ...SLIDE, arteUrl: "https://cdn.test/arte.jpg" });

    const copia = container.querySelector('img[aria-hidden="true"]');
    expect(copia).not.toBeNull();
    expect(copia.className).toContain("blur-md");
    // El `scale-110` cubre el sangrado del blur en los bordes.
    expect(copia.className).toContain("scale-110");
    expect(container.innerHTML).not.toContain("backdrop-blur");
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

  it("el doodle también es decorativo, sin arte de por medio", () => {
    // Sin arte el slide pinta el doodle, que es la otra rama: el guard de
    // arriba no la toca porque ahí el doodle ni se renderiza.
    const { container } = renderSlide(SLIDE);

    const imagenes = container.querySelectorAll("img");
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]).toHaveAttribute("alt", "");
  });
});
