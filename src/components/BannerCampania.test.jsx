import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BannerCampania from "./BannerCampania.jsx";

const BANNER = {
  campaniaId: 7,
  doodleUrl: "https://res.cloudinary.com/demo/primavera.png",
  titulo: "Semana del Hogar",
  texto: "Faltan {dias} días para que termine.",
  ctaTexto: "Ver la selección",
  ctaDestino: "/coleccion?campania=7",
  diasFaltantes: 6,
};

function montar(banner, props = {}) {
  return render(
    <MemoryRouter>
      <BannerCampania banner={banner} {...props} />
    </MemoryRouter>,
  );
}

describe("BannerCampania", () => {
  it("sin banner no renderiza nada: una franja vacía se lee como error de carga", () => {
    const { container } = montar(null);

    expect(container).toBeEmptyDOMElement();
  });

  it("sustituye {dias} por el número que YA resolvió el backend", () => {
    montar(BANNER);

    expect(screen.getByText("Faltan 6 días para que termine.")).toBeInTheDocument();
  });

  it("sin dias faltantes, el marcador no queda escrito en pantalla", () => {
    montar({ ...BANNER, texto: "Faltan {dias} días.", diasFaltantes: null });

    expect(screen.queryByText(/\{dias\}/)).toBeNull();
  });

  it("sin contador, sacar el marcador no deja doble espacio", () => {
    // `getByText` normaliza espacios en la búsqueda, así que un `toBeInTheDocument`
    // pasaría igual con el bug adentro: se lee el `textContent` crudo.
    const { container } = montar({ ...BANNER, texto: "Faltan {dias} días.", diasFaltantes: null });

    const parrafo = Array.from(container.querySelectorAll("p")).find((p) =>
      p.textContent.includes("días"),
    );
    expect(parrafo.textContent).toBe("Faltan días.");
  });

  it("el CTA lleva al destino que resolvió el backend", () => {
    montar(BANNER);

    expect(screen.getByRole("link", { name: "Ver la selección" })).toHaveAttribute(
      "href",
      "/coleccion?campania=7",
    );
  });

  it("sin destino no hay botón, y el banner sigue siendo legible", () => {
    montar({ ...BANNER, ctaDestino: null, ctaTexto: null });

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Semana del Hogar")).toBeInTheDocument();
  });

  it("con interactivo apagado el CTA no navega", () => {
    const { container } = montar(BANNER, { interactivo: false });

    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText("Ver la selección")).toBeInTheDocument();
  });

  it("el arte va absolute inset-0 dentro de su caja con aspect-*", () => {
    const { container } = montar(BANNER);

    const img = container.querySelector("img");
    expect(img.className).toMatch(/\babsolute\b/);
    expect(img.className).toMatch(/\binset-0\b/);
  });

  it("sin arte cae a un placeholder de marca, nunca a un ícono roto", () => {
    const { container } = montar({ ...BANNER, doodleUrl: null });

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Semana del Hogar")).toBeInTheDocument();
  });

  // M6: `modalFechaObjetivo` es independiente de `hasta`, así que una campaña
  // vigente con objetivo ya pasado es legal — el backend puede mandar un
  // `diasFaltantes` negativo, y "-3 días" no es un dato que el cliente pueda
  // leer.
  it("con diasFaltantes negativo no muestra la píldora", () => {
    // Texto sin `{dias}` para no confundir la píldora (ausente) con la
    // sustitución del cuerpo (que sí puede mostrar el número, si lo llevara).
    montar({ ...BANNER, diasFaltantes: -3, texto: "Última semana." });

    expect(screen.queryByText(/-3/)).toBeNull();
    expect(screen.queryByText(/día/)).toBeNull();
  });
});
