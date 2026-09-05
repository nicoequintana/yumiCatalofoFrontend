import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getContextoComercialMock = vi.fn();
let tokenActual = null;

vi.mock("../api/campanias.js", () => ({
  getContextoComercial: (...args) => getContextoComercialMock(...args),
}));

vi.mock("../api/authClient.js", () => ({
  getToken: () => tokenActual,
}));

const { default: useContextoComercial, reiniciarContextoComercial } = await import(
  "./useContextoComercial.js"
);

/** Sonda mínima: pinta lo que el hook devuelve. */
function Sonda({ etiqueta = "a" }) {
  const { doodle, claveDia, resuelto } = useContextoComercial();
  return (
    <span data-testid={etiqueta}>
      {doodle ? doodle.url : "sin-doodle"}|{claveDia ?? "sin-clave"}|
      {resuelto ? "resuelto" : "pendiente"}
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
  tokenActual = null;
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

  it("vuelve a pedir el contexto cuando cambia la identidad de quien pregunta", async () => {
    // ESTE ES EL BUG QUE ARREGLA. La pantalla de login vive dentro del Layout
    // público, así que el Navbar dispara el fetch SIN token y el backend omite
    // `doodleAdmin` a propósito. Loguearse es `setToken` + `navigate`, o sea
    // navegación SPA sin recarga: con un cache ciego a la identidad, el
    // contexto anónimo quedaba vigente para toda la sesión y el Doodle del
    // panel no se veía NUNCA salvo que alguien apretara F5.
    const anonimo = { claveDia: "2026-09-15", doodle: null };
    const conSesion = { claveDia: "2026-09-15", doodle: null, doodleAdmin: { url: "x.png", campaniaId: 9 } };

    getContextoComercialMock.mockResolvedValue(anonimo);
    const login = render(<Sonda />);
    await waitFor(() => expect(getContextoComercialMock).toHaveBeenCalledTimes(1));
    login.unmount();

    // El admin se loguea: aparece el token, sin recargar la página.
    tokenActual = "token-de-admin";
    getContextoComercialMock.mockResolvedValue(conSesion);

    render(<Sonda />);

    await waitFor(() => expect(getContextoComercialMock).toHaveBeenCalledTimes(2));
  });

  it("cerrar sesión también vuelve a pedirlo", async () => {
    // El camino inverso: el contexto con `doodleAdmin` no puede sobrevivir al
    // logout, o el panel seguiría mostrando su Doodle a alguien sin sesión.
    tokenActual = "token-de-admin";
    const primera = render(<Sonda />);
    await waitFor(() => expect(getContextoComercialMock).toHaveBeenCalledTimes(1));
    primera.unmount();

    tokenActual = null;
    render(<Sonda />);

    await waitFor(() => expect(getContextoComercialMock).toHaveBeenCalledTimes(2));
  });

  it("con la MISMA identidad sigue reusando el cache", async () => {
    // La invalidación no puede volverse un refetch por montaje: eso destruiría
    // el motivo de existir del patrón.
    tokenActual = "token-de-admin";
    const primera = render(<Sonda />);
    await waitFor(() => expect(getContextoComercialMock).toHaveBeenCalledTimes(1));
    primera.unmount();

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("2026-09-15"));
    expect(getContextoComercialMock).toHaveBeenCalledTimes(1);
  });

  it("marca `resuelto` cuando el intento TERMINÓ, haya andado o no", async () => {
    // Sin esto, "todavía no llegó" y "falló y no va a llegar" son el mismo
    // estado, y una pantalla que espere `claveDia` para dibujarse deja el
    // spinner girando para siempre — que es justamente lo que el proyecto
    // prohíbe: hay que distinguir "falló la carga" de "no hay nada".
    getContextoComercialMock.mockRejectedValue(new Error("backend caído"));

    render(<Sonda />);

    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("sin-doodle|sin-clave|resuelto");
    });
  });

  it("`resuelto` arranca en false", () => {
    let resolver;
    getContextoComercialMock.mockReturnValue(new Promise((r) => (resolver = r)));

    render(<Sonda />);

    expect(screen.getByTestId("a")).toHaveTextContent("pendiente");
    resolver(CONTEXTO);
  });

  it("desmontar la última instancia no rompe ni deja listeners colgados", async () => {
    const vista = render(<Sonda />);
    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("2026-09-15"));

    expect(() => vista.unmount()).not.toThrow();
  });

  it("expone el banner que emite el backend", async () => {
    getContextoComercialMock.mockResolvedValue({
      claveDia: "2026-09-04",
      doodle: null,
      modal: null,
      banner: { campaniaId: 7, titulo: "Semana del Hogar", ctaDestino: "/coleccion?campania=7" },
    });

    const { result } = renderHook(() => useContextoComercial());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.banner).toMatchObject({ campaniaId: 7, titulo: "Semana del Hogar" });
  });

  it("un backend caído deja el banner en null, no rompe el catálogo", async () => {
    getContextoComercialMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useContextoComercial());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.banner).toBeNull();
  });
});
