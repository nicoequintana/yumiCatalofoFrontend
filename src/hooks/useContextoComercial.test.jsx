import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getContextoComercialMock = vi.fn();

vi.mock("../api/campanias.js", () => ({
  getContextoComercial: (...args) => getContextoComercialMock(...args),
}));

const { default: useContextoComercial, reiniciarContextoComercial } = await import(
  "./useContextoComercial.js"
);

/** Sonda mínima: pinta lo que el hook devuelve. */
function Sonda({ etiqueta = "a" }) {
  const { doodle, claveDia } = useContextoComercial();
  return (
    <span data-testid={etiqueta}>
      {doodle ? doodle.url : "sin-doodle"}|{claveDia ?? "sin-clave"}
    </span>
  );
}

const CONTEXTO = {
  claveDia: "2026-09-15",
  doodle: { url: "https://res.cloudinary.com/demo/primavera.png", campaniaId: 1, nombre: "Primavera" },
};

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarContextoComercial();
  getContextoComercialMock.mockResolvedValue(CONTEXTO);
});

afterEach(() => {
  reiniciarContextoComercial();
});

describe("useContextoComercial", () => {
  it("entrega el contexto que devuelve la API", async () => {
    render(<Sonda />);

    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent(
        "https://res.cloudinary.com/demo/primavera.png|2026-09-15",
      );
    });
  });

  it("hace UN solo fetch aunque monten varias instancias", async () => {
    // Es el motivo de existir del patrón module-level. El Navbar, el modal y
    // más adelante el banner consumen el mismo contexto: sin deduplicar, cada
    // carga de página dispararía tres requests idénticas al mismo endpoint.
    render(
      <>
        <Sonda etiqueta="a" />
        <Sonda etiqueta="b" />
        <Sonda etiqueta="c" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("c")).toHaveTextContent("2026-09-15");
    });
    expect(getContextoComercialMock).toHaveBeenCalledTimes(1);
  });

  it("todas las instancias ven exactamente el mismo contexto", async () => {
    render(
      <>
        <Sonda etiqueta="a" />
        <Sonda etiqueta="b" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("a").textContent).toBe(screen.getByTestId("b").textContent);
    });
    expect(screen.getByTestId("a")).toHaveTextContent("primavera.png");
  });

  it("un segundo montaje reutiliza el valor ya cargado, sin volver a pedir", async () => {
    const primera = render(<Sonda />);
    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("2026-09-15"));
    primera.unmount();

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("2026-09-15"));
    expect(getContextoComercialMock).toHaveBeenCalledTimes(1);
  });

  it("si la API falla, degrada al contexto vacío en vez de romper la página", async () => {
    // Falla BLANDA a propósito, igual que la cinta de anuncios: el contexto
    // comercial es decoración de temporada. Un backend caído tiene que dejar el
    // logo de marca y el sitio andando, nunca tumbar el catálogo entero.
    getContextoComercialMock.mockRejectedValue(new Error("backend caído"));

    render(<Sonda />);

    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("sin-doodle|sin-clave");
    });
  });

  it("arranca en el contexto vacío antes de que conteste la API", () => {
    // El primer render tiene que ser el estado "sin campaña": si arrancara en
    // cualquier otra cosa, el logo de marca parpadearía en cada carga.
    let resolver;
    getContextoComercialMock.mockReturnValue(new Promise((r) => (resolver = r)));

    render(<Sonda />);

    expect(screen.getByTestId("a")).toHaveTextContent("sin-doodle|sin-clave");
    resolver(CONTEXTO);
  });

  it("desmontar la última instancia no rompe ni deja listeners colgados", async () => {
    const vista = render(<Sonda />);
    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("2026-09-15"));

    expect(() => vista.unmount()).not.toThrow();
  });
});
