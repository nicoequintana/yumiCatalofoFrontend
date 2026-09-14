import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SlideCampania from "./SlideCampania.jsx";

const registrarEventoComercialMock = vi.fn();
vi.mock("../api/campanias.js", () => ({
  registrarEventoComercial: (...args) => registrarEventoComercialMock(...args),
}));

/**
 * La forma EXACTA que emite `aSlideCampania` desde el 14/09/2026: sin
 * `ctaTexto` y sin `color` (06/09), y con `nombre` sumado como fallback del
 * nombre accesible cuando no hay `titulo` cargado (decisión de usuario
 * 2026-09-14: el título del banner dejó de ser obligatorio, el texto vive en
 * la imagen que sube el admin).
 */
const SLIDE = {
  tipo: "CAMPANIA",
  campaniaId: 7,
  titulo: "Primavera YIMA",
  nombre: "Primavera YIMA",
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

    // Decorativa (`alt=""`): no tiene rol "img" en el árbol de accesibilidad,
    // así que se busca por el DOM, no por rol.
    expect(container.querySelector("img")).toHaveAttribute("src", SLIDE.doodleUrl);
    expect(container.querySelector(".bg-primary")).not.toBeNull();
  });

  it("con arte, la imagen llena el slide y el doodle NO se muestra", () => {
    // Dos imágenes en 135 px de alto es ruido: con arte, el doodle sobra.
    const { container } = renderSlide({
      ...SLIDE,
      arteUrl: "https://cdn.test/arte.jpg",
      doodleUrl: "https://cdn.test/doodle.png",
    });

    // Decisión de usuario 2026-09-14: la imagen se muestra COMPLETA, sin
    // tinte ni vidrio encima — el texto vive adentro de la pieza que sube el
    // admin. Con eso, con arte hay UNA sola `<img>`, no dos.
    const imagenes = [...container.querySelectorAll("img")];
    expect(imagenes).toHaveLength(1);
    expect(imagenes[0]).toHaveAttribute("src", "https://cdn.test/arte.jpg");
    expect(container.querySelector('img[src="https://cdn.test/doodle.png"]')).toBeNull();
  });

  it("con arte, no hay overlay: ni tinte ni vidrio desenfocado", () => {
    // Hasta el 13/09/2026 el arte llevaba una copia desenfocada y un degradé
    // para que el copy se leyera encima. Sin copy que proteger, el overlay
    // entero se fue: la imagen se muestra tal cual la sube el admin.
    const { container } = renderSlide({ ...SLIDE, arteUrl: "https://cdn.test/arte.jpg" });

    expect(container.querySelector(".bg-gradient-to-r")).toBeNull();
    expect(container.querySelector('img[aria-hidden="true"]')).toBeNull();
    expect(container.innerHTML).not.toContain("blur-md");
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
    const { container } = renderSlide({ ...SLIDE, arteUrl: null, doodleUrl: null, color: "VERDE" });

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

  it("sin título cargado, el nombre accesible cae al nombre de la campaña/promoción", () => {
    // Decisión de usuario 2026-09-14: el título del banner dejó de ser
    // obligatorio (el texto vive en la imagen), así que un slide puede llegar
    // sin `titulo`. El link igual necesita un nombre accesible — lo da
    // `slide.nombre`, que el backend suma para este único fin.
    renderSlide({ ...SLIDE, titulo: null, nombre: "Primavera YIMA" });

    expect(screen.getByRole("link", { name: "Primavera YIMA" })).toHaveAttribute(
      "href",
      "/coleccion?campania=7",
    );
  });

  it("el título y el texto NO se pintan visualmente: el texto vive en la imagen", () => {
    // Decisión de usuario 2026-09-14: el admin ya no escribe título/texto de
    // un banner, solo decide si se muestra y qué imagen sube. El campo sigue
    // viajando (se usa como nombre accesible), pero no se pinta como copy.
    renderSlide(SLIDE);

    expect(screen.queryByText(SLIDE.titulo)).toBeNull();
    expect(screen.queryByText(SLIDE.texto)).toBeNull();
  });

  it("hay UN solo link por slide: la señal del CTA no es un ancla adentro de otra", () => {
    // Un `<a>` dentro de otro `<a>` es HTML inválido, y los navegadores lo
    // "arreglan" cerrando la primera: media tarjeta deja de ser clickeable, sin
    // ningún error. La señal del CTA tiene que ser un `<span>`.
    renderSlide(SLIDE);

    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("NO hay señal de CTA: ni texto ni flecha, el banner entero es el botón", () => {
    renderSlide(SLIDE);

    expect(screen.queryByText(/ver más/i)).toBeNull();
    expect(screen.queryByText("→")).toBeNull();
  });

  it("sin destino el slide no navega", () => {
    // No hay nada visual que sacar —ya no existe la señal—, lo que cambia es
    // que el envoltorio deja de ser un `<Link>` y baja a un `<div>`.
    renderSlide({ ...SLIDE, ctaDestino: null });

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("interactivo={false} no navega: es la vista previa del panel", () => {
    renderSlide(SLIDE, { interactivo: false });

    expect(screen.queryByRole("link")).toBeNull();
  });

  it("las imágenes son decorativas: alt vacío en todos los casos", () => {
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

describe("click del slide", () => {
  const slide = {
    tipo: "CAMPANIA",
    campaniaId: 7,
    promocionId: null,
    titulo: "Primavera",
    nombre: "Primavera",
    texto: "Hasta 30%",
    ctaDestino: "/coleccion?campania=7",
    ctaTipo: "CAMPANIA",
    arteUrl: null,
    doodleUrl: null,
  };

  beforeEach(() => {
    registrarEventoComercialMock.mockClear();
  });

  it("registra el click con el destino que mandó el backend", async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <SlideCampania slide={slide} />
      </MemoryRouter>,
    );

    await usuario.click(screen.getByRole("link", { name: "Primavera" }));

    expect(registrarEventoComercialMock).toHaveBeenCalledWith({
      tipo: "CLICK_COMERCIAL",
      origen: "BANNER",
      campaniaId: 7,
      promocionId: null,
      destino: "CAMPANIA",
    });
  });

  it("un slide de promoción manda su promocionId y destino PROMOCION", async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <SlideCampania
          slide={{
            ...slide,
            tipo: "PROMOCION",
            campaniaId: null,
            promocionId: 9,
            ctaDestino: "/coleccion?promocion=9",
            ctaTipo: "PROMOCION",
          }}
        />
      </MemoryRouter>,
    );

    await usuario.click(screen.getByRole("link", { name: "Primavera" }));

    expect(registrarEventoComercialMock).toHaveBeenCalledWith({
      tipo: "CLICK_COMERCIAL",
      origen: "BANNER",
      campaniaId: null,
      promocionId: 9,
      destino: "PROMOCION",
    });
  });

  it("la vista previa del editor NO emite", async () => {
    const usuario = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <SlideCampania slide={slide} interactivo={false} />
      </MemoryRouter>,
    );

    // Sin `interactivo`, el envoltorio es un `<div>` sin nombre accesible (el
    // copy ya no se pinta): se clickea el nodo raíz directo.
    await usuario.click(container.firstChild);

    expect(registrarEventoComercialMock).not.toHaveBeenCalled();
  });
});
