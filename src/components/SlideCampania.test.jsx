import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import SlideCampania from "./SlideCampania.jsx";

/**
 * La forma EXACTA que emite `aSlideCampania` desde el 06/09/2026: sin
 * `ctaTexto` y sin `color`. Los dos dejaron de viajar cuando el slide entero
 * pasó a ser el enlace — el copy de la señal es fijo acá y el molde sin arte va
 * siempre en el color de marca.
 */
const SLIDE = {
  tipo: "CAMPANIA",
  campaniaId: 7,
  titulo: "Primavera YIMA",
  texto: "Renovamos la casa",
  ctaDestino: "/coleccion?campania=7",
  arteUrl: null,
  doodleUrl: "https://cdn.test/doodle.png",
};

function renderSlide(slide, props) {
  return render(
    <MemoryRouter>
      <SlideCampania slide={slide} {...props} />
    </MemoryRouter>,
  );
}

describe("SlideCampania", () => {
  it("sin arte, pinta el color de marca y muestra el doodle", () => {
    const { container } = renderSlide(SLIDE);

    expect(screen.getByText("Primavera YIMA")).toBeInTheDocument();
    // Decorativa (`alt=""`): no tiene rol "img" en el árbol de accesibilidad,
    // así que se busca por el DOM, no por rol.
    expect(container.querySelector("img")).toHaveAttribute("src", SLIDE.doodleUrl);
    expect(container.querySelector(".bg-primary")).not.toBeNull();
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

  it("un `color` que llegue de una respuesta vieja no cambia nada", () => {
    // El backend dejó de emitir `color` el 06/09/2026, pero una pestaña abierta
    // desde antes puede tener slides cacheados que todavía lo traigan. El molde
    // sin arte se pinta con el color de marca IGUAL: el dato ya no se lee.
    const { container } = renderSlide({ ...SLIDE, color: "VERDE" });

    expect(container.querySelector(".bg-primary")).not.toBeNull();
    expect(container.querySelector(".bg-secondary")).toBeNull();
  });

  it("el slide ENTERO es el link, y su nombre accesible es el título", () => {
    // No es el `ctaTexto`: un lector de pantalla que anuncia "Ver más" no dice a
    // dónde va. Con el título, dice "Primavera YIMA, enlace".
    renderSlide(SLIDE);

    expect(screen.getByRole("link", { name: "Primavera YIMA" })).toHaveAttribute(
      "href",
      "/coleccion?campania=7",
    );
  });

  it("hay UN solo link por slide: la señal del CTA no es un ancla adentro de otra", () => {
    // Un `<a>` dentro de otro `<a>` es HTML inválido, y los navegadores lo
    // "arreglan" cerrando la primera: media tarjeta deja de ser clickeable, sin
    // ningún error. La señal del CTA tiene que ser un `<span>`.
    renderSlide(SLIDE);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("el CTA usa un copy fijo, no uno que venga en el slide", () => {
    // Dejó de ser editable: el backend no manda `ctaTexto` y el componente pone
    // siempre el mismo texto.
    renderSlide(SLIDE);

    expect(screen.getByText("Ver más")).toBeInTheDocument();
  });

  it("sin destino no hay señal de CTA", () => {
    // Sin `ctaDestino` el slide no navega: dibujar una flecha que promete un
    // enlace inexistente es peor que no dibujar nada.
    renderSlide({ ...SLIDE, ctaDestino: null });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("Ver más")).toBeNull();
  });

  it("interactivo={false} dibuja el CTA sin navegar", () => {
    // La vista previa del panel: la señal se ve, pero el slide no es un link.
    renderSlide(SLIDE, { interactivo: false });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Ver más")).toBeInTheDocument();
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
