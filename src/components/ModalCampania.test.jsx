import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ModalCampania from "./ModalCampania.jsx";

const registrarEventoComercialMock = vi.fn();
vi.mock("../api/campanias.js", () => ({
  registrarEventoComercial: (...args) => registrarEventoComercialMock(...args),
}));

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
function montar(extra = {}, onCerrar = () => {}) {
  render(
    <MemoryRouter>
      <ModalCampania modal={{ ...BASE, ...extra }} onCerrar={onCerrar} />
    </MemoryRouter>,
  );
  return screen.getByRole("dialog");
}

/** El velo es el padre del diálogo: `VeloModal` lo monta en `body`. */
function velo() {
  return screen.getByRole("dialog").parentElement;
}

describe("ModalCampania — la salida del cartel en un celular", () => {
  // El cartel es `fixed inset-0` y se monta en el Layout: aparece en TODA ruta
  // pública, el checkout incluido. `useDialogo` da Escape, pero en un celular
  // no hay teclado — el botón de cerrar y el velo son las dos únicas salidas,
  // y las dos son táctiles.
  it("el botón de cerrar mide 44×44, no 36×36", () => {
    // Medido en navegador: `p-2` + un ícono de 20px daba 36×36, por debajo del
    // mínimo de 44×44 de WCAG 2.5.8 / las guías de iOS y Android. jsdom no
    // calcula layout, así que se afirma sobre la clase que produce el tamaño.
    montar();

    const cerrar = screen.getByRole("button", { name: "Cerrar" });
    expect(cerrar.className).toContain("h-11");
    expect(cerrar.className).toContain("w-11");
  });

  it("tocar el velo cierra", () => {
    const onCerrar = vi.fn();
    montar({}, onCerrar);

    fireEvent.pointerDown(velo());
    fireEvent.click(velo());

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("tocar DENTRO del cartel no cierra", () => {
    const onCerrar = vi.fn();
    const dialogo = montar({}, onCerrar);

    fireEvent.pointerDown(dialogo);
    fireEvent.click(dialogo);

    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("un arrastre que EMPIEZA adentro y termina afuera no cierra", () => {
    // Seleccionar texto del cartel y soltar el botón fuera de él produce un
    // `click` cuyo target es el velo: sin recordar dónde empezó el gesto, leer
    // un párrafo cerraría el cartel.
    const onCerrar = vi.fn();
    const dialogo = montar({}, onCerrar);

    fireEvent.pointerDown(dialogo);
    fireEvent.click(velo());

    expect(onCerrar).not.toHaveBeenCalled();
  });
});

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

it("el click del CTA registra y después cierra, en ese orden", async () => {
  const usuario = userEvent.setup();
  const orden = [];
  registrarEventoComercialMock.mockImplementation(() => orden.push("registro"));
  const cerrar = vi.fn(() => orden.push("cierre"));

  render(
    <MemoryRouter>
      <ModalCampania
        modal={{
          campaniaId: 7,
          titulo: "Primavera",
          texto: "Ya viene",
          ctaTexto: "Ver la colección",
          ctaDestino: "/coleccion?campania=7",
          ctaTipo: "CAMPANIA",
          doodleUrl: null,
          diasFaltantes: 3,
        }}
        onCerrar={cerrar}
      />
    </MemoryRouter>,
  );

  await usuario.click(screen.getByRole("link", { name: "Ver la colección" }));

  expect(registrarEventoComercialMock).toHaveBeenCalledWith({
    tipo: "CLICK_COMERCIAL",
    origen: "MODAL",
    campaniaId: 7,
    destino: "CAMPANIA",
  });
  expect(cerrar).toHaveBeenCalled();
  expect(orden).toEqual(["registro", "cierre"]);
});
