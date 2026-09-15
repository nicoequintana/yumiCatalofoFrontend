import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * El loader de carga de la home.
 *
 * Contexto (07/09/2026): la home abre con MERCADERÍA y el hero va al pie, así
 * que las cuatro secciones de arriba —carrusel de campañas, círculos de
 * categoría, riel de ofertas y destacados— devuelven `null` mientras no tienen
 * datos y EMPUJAN el hero hacia abajo cuando los fetch aterrizan. Medido en
 * producción con Playwright: el hero salta 792 px y el CLS da 0.407.
 *
 * Desde el rediseño del 13/09/2026 son NUEVE fuentes: se suman promo
 * destacada, más vendidos, producto ícono, nuevos ingresos y —14/09/2026— las
 * vitrinas de campaña.
 *
 * Este loader NO arregla ese salto: lo TAPA hasta que las fuentes
 * terminaron. Los tests de acá fijan las tres cosas que lo vuelven seguro:
 * que tape, que se suelte, y que se suelte IGUAL si una fuente nunca contesta.
 */

const getProductsMock = vi.fn();
const getCategoriasMock = vi.fn();
const getContextoComercialMock = vi.fn();
const getProductosMasVendidosMock = vi.fn();
const getPromocionDestacadaMock = vi.fn();
const getConfiguracionHomeMock = vi.fn();
const getVitrinasCampaniaMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProducts: (...args) => getProductsMock(...args),
  getProductosMasVendidos: (...args) => getProductosMasVendidosMock(...args),
}));
vi.mock("../api/promociones.js", () => ({
  getPromocionDestacada: (...args) => getPromocionDestacadaMock(...args),
}));
vi.mock("../api/config.js", () => ({
  getConfiguracionHome: (...args) => getConfiguracionHomeMock(...args),
}));
vi.mock("../api/categorias.js", () => ({
  getCategorias: (...args) => getCategoriasMock(...args),
}));
vi.mock("../api/campanias.js", () => ({
  getContextoComercial: (...args) => getContextoComercialMock(...args),
  getVitrinasCampania: (...args) => getVitrinasCampaniaMock(...args),
}));
vi.mock("../api/authClient.js", () => ({ getToken: () => null }));
// Esta suite usa los hooks reales; sin este mock, `useCombosCatalogo` saldría
// a la red de verdad.
vi.mock("../api/combos.js", () => ({ getCombos: () => Promise.resolve([]) }));

const { default: Catalogo } = await import("./Catalogo.jsx");
const { reiniciarContextoComercial } = await import("../hooks/useContextoComercial.js");
const { reiniciarCategoriasNavbar } = await import("../hooks/useCategoriasNavbar.js");
const { TECHO_ESPERA_MS } = await import("../hooks/useTechoDeEspera.js");

const TITULO_HERO = "Objetos singulares que transforman tu cotidiano.";

/** Promesa que nunca se cumple — "esta fuente no contesta". */
function nuncaResuelve() {
  return new Promise(() => {});
}

function pagina(filas = []) {
  return { data: filas, page: 1, pageSize: 12, total: filas.length };
}

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Catalogo />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Dos de las cuatro fuentes cachean a nivel de MÓDULO, así que sin esto el
  // segundo test heredaría el estado resuelto del primero.
  reiniciarContextoComercial();
  reiniciarCategoriasNavbar();

  getProductsMock.mockResolvedValue(pagina());
  getCategoriasMock.mockResolvedValue([]);
  getContextoComercialMock.mockResolvedValue({ claveDia: "2026-09-07", slides: [] });
  getProductosMasVendidosMock.mockResolvedValue(pagina());
  getPromocionDestacadaMock.mockResolvedValue(null);
  getConfiguracionHomeMock.mockResolvedValue({ productoIcono: null });
  getVitrinasCampaniaMock.mockResolvedValue([]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Catalogo — loader de carga inicial", () => {
  // Cada fuente nueva (rediseño 13/09/2026) tiene que estar en el gate: una
  // sección que empieza en `null` sin su `resuelto` es justo el salto escondido
  // que el comentario de `Catalogo.jsx` advierte.
  it.each([
    ["la promo destacada", () => getPromocionDestacadaMock],
    ["los más vendidos", () => getProductosMasVendidosMock],
    ["el producto ícono", () => getConfiguracionHomeMock],
    ["las vitrinas de campaña", () => getVitrinasCampaniaMock],
  ])("tapa la home mientras %s no resolvió", async (_nombre, mock) => {
    mock().mockReturnValue(nuncaResuelve());

    renderHome();

    await waitFor(() => expect(getProductsMock).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("tapa la home mientras los nuevos ingresos no resolvieron", async () => {
    getProductsMock.mockImplementation((params) =>
      params?.orden === "recientes" ? nuncaResuelve() : Promise.resolve(pagina()),
    );

    renderHome();

    await waitFor(() => expect(getProductsMock).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("tapa la home mientras alguna de las fuentes originales no resolvió", async () => {
    // Las categorías nunca contestan; las otras tres sí.
    getCategoriasMock.mockReturnValue(nuncaResuelve());

    renderHome();

    // Se le da tiempo a las tres que SÍ resuelven.
    await waitFor(() => expect(getProductsMock).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByRole("status")).toBeInTheDocument();
    // El hero —y con él el único <h1> de la home— no está en el DOM: si
    // estuviera, el navegador ya lo habría maquetado y el salto ocurriría
    // igual, tapado o no.
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
  });

  it("suelta la home cuando las nueve fuentes resolvieron", async () => {
    renderHome();

    expect(await screen.findByRole("heading", { level: 1, name: TITULO_HERO })).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("se suelta IGUAL pasado el techo, aunque una fuente nunca resuelva", async () => {
    // Solo los timers: faquear `Date` o los microtasks rompería las promesas
    // de los mocks, y el test moriría por timeout en vez de fallar por lo que
    // afirma.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

    getCategoriasMock.mockReturnValue(nuncaResuelve());
    getContextoComercialMock.mockReturnValue(nuncaResuelve());
    getPromocionDestacadaMock.mockReturnValue(nuncaResuelve());
    getConfiguracionHomeMock.mockReturnValue(nuncaResuelve());

    renderHome();

    await act(async () => {});
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Un milisegundo antes del techo el loader sigue puesto: fija el valor,
    // no solo "en algún momento se suelta".
    await act(async () => {
      vi.advanceTimersByTime(TECHO_ESPERA_MS - 1);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });

    // Un loader sin techo es un sitio caído: fuentes colgadas no pueden
    // dejar la home en blanco para siempre.
    expect(screen.getByRole("heading", { level: 1, name: TITULO_HERO })).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("el techo es MUY anterior al timeout de los fetch de la app", async () => {
    // `api/http.js` aborta a los 15 s. Si el techo no fuera bastante menor, un
    // fetch colgado dejaría la home en blanco hasta que ese abort dispare —
    // peor que el salto que este loader vino a esconder.
    expect(TECHO_ESPERA_MS).toBeLessThan(15_000 / 3);
  });
});
