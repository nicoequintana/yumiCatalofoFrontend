import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Coleccion from "./Coleccion.jsx";
import * as productsApi from "../api/products.js";
import * as categoriasApi from "../api/categorias.js";

vi.mock("../api/products.js");
vi.mock("../api/categorias.js");

// Spy que registra cada setSearchParams(next, options) hecho a través del
// useSearchParams real de react-router-dom, para afirmar que Coleccion.jsx
// pasa { replace: true } en cada cambio de filtro — sin esto, el push por
// defecto de v7 apila una entrada de historial por cada ajuste de filtro.
const llamadasSetSearchParams = [];
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSearchParams: (...args) => {
      const [params, setParams] = actual.useSearchParams(...args);
      const wrapped = (next, options) => {
        llamadasSetSearchParams.push(options);
        return setParams(next, options);
      };
      return [params, wrapped];
    },
  };
});

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
};

// Margen por encima del debounce de búsqueda (350ms) de `Coleccion.jsx`,
// para dejar que cualquier commit tardío a la URL se dispare antes de
// afirmar sobre el estado final.
const DEBOUNCE_MS_MARGEN = 500;

const CATEGORIAS = [
  { id: 1, nombre: "Relojes", cantidadProductos: 2 },
  { id: 2, nombre: "Anillos", cantidadProductos: 1 },
];

/**
 * Sobre de página que devuelve `GET /products`. Los tests declaran las filas y
 * el helper arma el `{ data, page, pageSize, total }` alrededor.
 */
function pagina(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 12, total: filas.length, ...extra };
}

// Se envuelve en <StrictMode> a propósito, igual que `main.jsx`: la doble
// invocación del cuerpo del componente en el mount rompe cualquier lógica de
// "primer render" basada en refs mutables, y el reseteo de filtros heredados
// depende exactamente de eso. Sin este wrapper los tests dan falsa confianza.
// Envuelto en `<Routes>` con las dos rutas reales (no solo `<Coleccion />` a
// secas): el selector de categoría navega a `/coleccion/categoria/:slug`
// (Task 17, fix de review), y sin un `<Route>` que matchee ese patrón
// `useParams()` siempre devuelve `{}` — la navegación cambiaría la URL pero
// `Coleccion` nunca vería el `slugCategoria` resultante.
function renderPagina(ruta = "/coleccion") {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/coleccion" element={<Coleccion />} />
          <Route path="/coleccion/categoria/:slugCategoria" element={<Coleccion />} />
        </Routes>
      </MemoryRouter>
    </StrictMode>,
  );
}

describe("Coleccion - filtros y grid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llamadasSetSearchParams.length = 0;
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    categoriasApi.getCategorias.mockResolvedValue(CATEGORIAS);
  });

  it("renderiza la barra de filtros con las categorías cargadas", async () => {
    renderPagina();

    expect(await screen.findByLabelText("Categoría")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio min.")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio máx.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Relojes" })).toBeInTheDocument();
    });
  });

  it("hace fetch inicial del grid sin filtros", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        categoria: "",
        search: "",
        minPrecio: "",
        maxPrecio: "",
        page: 1,
        pageSize: 12,
      });
    });
  });

  // Fix de review (Task 17): la categoría es la IDENTIDAD de la página, no un
  // filtro — elegirla en el selector NAVEGA a `/coleccion/categoria/:slug`
  // (vía `rutaCategoria`), nunca escribe `?categoria=` en `searchParams`.
  // Escribirlo ahí reintroduciría el conflicto query-vs-ruta que la Task 17
  // vino a eliminar: `categoriaActiva` ya ignora la query cuando hay
  // `slugCategoria`, así que el control quedaría muerto, solo que ensuciando
  // la URL.
  it("elegir una categoría desde /coleccion NAVEGA a su URL propia (no escribe ?categoria=)", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Reloj Clásico");
    productsApi.getProducts.mockClear();
    llamadasSetSearchParams.length = 0;

    const select = screen.getByLabelText("Categoría");
    await user.selectOptions(select, "1");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "1" }),
      );
    });
    // La prueba de que fue navegación y no un filtro: cero llamadas al
    // `setSearchParams` espiado.
    expect(llamadasSetSearchParams).toHaveLength(0);
  });

  it("cambiar un filtro (búsqueda) usa { replace: true } para no apilar historial", async () => {
    // La categoría dejó de pasar por acá (ver el test de arriba) — el único
    // camino que sigue escribiendo en `searchParams` son los filtros reales
    // (búsqueda, precio).
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Reloj Clásico");
    llamadasSetSearchParams.length = 0;

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const input = screen.getByLabelText("Buscar");
    await user.type(input, "reloj");
    vi.advanceTimersByTime(400);
    vi.useRealTimers();

    await waitFor(() => {
      expect(llamadasSetSearchParams.length).toBeGreaterThan(0);
    });
    expect(llamadasSetSearchParams.every((opts) => opts?.replace === true)).toBe(true);
  });

  it("cambiar de categoría estando ya en una NAVEGA a la nueva y apila historial (push, no replace)", async () => {
    // Segunda dirección del fix de review: no solo "elegir desde /coleccion"
    // sino también "cambiar de una categoría a otra". Push, no replace: pasar
    // de una categoría a otra es ir a OTRA página del sitio (mismo criterio
    // que el Paginador con `page`, no el de un filtro de precio/búsqueda) —
    // "atrás" tiene que devolver a la categoría anterior, no saltarla.
    //
    // La prueba real de push-vs-replace es esta: con un solo entry inicial
    // ("/coleccion/categoria/relojes"), si el cambio de categoría fuera
    // `replace`, "atrás" no tendría a dónde ir (se quedaría en Anillos). Solo
    // con `push` el historial pasa a tener dos entries y "atrás" recupera
    // Relojes.
    const user = userEvent.setup();

    function ConBotonAtras() {
      const irAtras = useNavigate();
      return (
        <>
          <button type="button" onClick={() => irAtras(-1)}>
            Atrás
          </button>
          <Coleccion />
        </>
      );
    }

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/coleccion/categoria/relojes"]}>
          <Routes>
            <Route path="/coleccion" element={<ConBotonAtras />} />
            <Route path="/coleccion/categoria/:slugCategoria" element={<ConBotonAtras />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Relojes"));
    productsApi.getProducts.mockClear();

    const select = screen.getByLabelText("Categoría");
    await user.selectOptions(select, "2");

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Anillos");
    });
    expect(productsApi.getProducts).toHaveBeenCalledWith(expect.objectContaining({ categoria: "2" }));
    // Push, no replace: esta navegación NUNCA pasa por el `setSearchParams`
    // espiado (que es, de todos modos, exclusivo del mecanismo de filtros).
    expect(llamadasSetSearchParams).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Atrás" }));

    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Relojes"));
  });

  it("muestra el estado vacío 'Sin resultados' cuando no hay coincidencias con filtros", async () => {
    const user = userEvent.setup();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    renderPagina();

    await screen.findByText("Reloj Clásico");

    productsApi.getProducts.mockResolvedValue(pagina([]));
    const select = screen.getByLabelText("Categoría");
    await user.selectOptions(select, "1");

    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
  });

  it("debounce: el input de búsqueda no dispara fetch inmediatamente, solo tras la pausa", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Reloj Clásico");
    productsApi.getProducts.mockClear();

    vi.useFakeTimers({ shouldAdvanceTime: true });

    const input = screen.getByLabelText("Buscar");
    await user.type(input, "reloj");

    // Todavía no — el debounce no transcurrió.
    expect(productsApi.getProducts).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    vi.useRealTimers();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: "reloj" }),
      );
    });
  });

  it("navegar a /coleccion sin ?search= limpia el input y NO resucita el término borrado", async () => {
    // Mismo bug que el buscador del admin: al navegar (Atrás, o un link a la
    // ruta pelada) el componente no se desmonta, `searchUrl` pasa a "" pero el
    // input conservaba el término, y el debounce lo volvía a escribir en la
    // URL 350 ms después.
    const user = userEvent.setup();

    function AppConNavegacion() {
      const navigate = useNavigate();
      const location = useLocation();
      return (
        <>
          <button type="button" onClick={() => navigate("/coleccion")}>
            Ir a Coleccion
          </button>
          <span data-testid="url-actual">{`${location.pathname}${location.search}`}</span>
          <Coleccion />
        </>
      );
    }

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/coleccion"]}>
          <AppConNavegacion />
        </MemoryRouter>
      </StrictMode>,
    );

    await screen.findByText("Reloj Clásico");

    const input = screen.getByLabelText("Buscar");
    await user.type(input, "reloj");

    await waitFor(() => {
      expect(screen.getByTestId("url-actual")).toHaveTextContent("search=reloj");
    });

    await user.click(screen.getByRole("button", { name: "Ir a Coleccion" }));

    // El input adopta el valor de la URL (vacío) en vez de conservar el suyo.
    await waitFor(() => expect(input).toHaveValue(""));

    // Pasado el debounce, la URL sigue limpia: el término no vuelve solo.
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS_MARGEN));
    expect(screen.getByTestId("url-actual")).toHaveTextContent(/^\/coleccion$/);
  });

  it("los filtros se resetean al entrar aunque la URL traiga querystring", async () => {
    renderPagina("/coleccion?categoria=2");

    // Se apunta específicamente a las llamadas del GRID (las que llevan los
    // cuatro filtros más la página), no a las del bento (que va con
    // `destacado`): si el reseteo fallara, la llamada del bento podría hacer
    // pasar una aserción más laxa.
    const llamadasDelGrid = () =>
      productsApi.getProducts.mock.calls
        .map(([params]) => params)
        .filter((params) => params.categoria !== undefined);

    await waitFor(() => {
      expect(llamadasDelGrid().length).toBeGreaterThan(0);
    });

    // La PRIMERA llamada del grid —la que decide qué ve el usuario al
    // entrar— ya tiene que salir sin el filtro heredado de la URL.
    expect(llamadasDelGrid()[0]).toEqual({
      categoria: "",
      search: "",
      minPrecio: "",
      maxPrecio: "",
      page: 1,
      pageSize: 12,
    });

    // Y el estado final tiene que quedar limpio: nada puede resucitar el
    // `?categoria=2` después del reseteo (el commit de debounce del mount lo
    // hacía, partiendo de un `prev` desactualizado).
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_MS_MARGEN));
    const ultimaDelGrid = llamadasDelGrid().at(-1);
    expect(ultimaDelGrid).toEqual({
      categoria: "",
      search: "",
      minPrecio: "",
      maxPrecio: "",
      page: 1,
      pageSize: 12,
    });
    expect(screen.getByLabelText("Categoría").value).toBe("");
  });

  it("tras entrar con querystring, los filtros del usuario ya no se blanquean", async () => {
    // Regresión: si el flag de "venía con filtros heredados" quedara
    // latcheado, cada filtro que el usuario aplicara después volvería a
    // leerse como heredado y se blanquearía — dejando la pantalla sin poder
    // filtrar justamente para quien entró por un link compartido.
    const user = userEvent.setup();
    renderPagina("/coleccion?categoria=2");

    await screen.findByText("Reloj Clásico");
    productsApi.getProducts.mockClear();

    const select = screen.getByLabelText("Categoría");
    await user.selectOptions(select, "1");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "1" }),
      );
    });
    expect(select.value).toBe("1");
  });

  it("no renderiza el carrusel de destacados — ese vive solo en la home", async () => {
    // El carrusel se sacó de /coleccion (queda únicamente en la home) para no
    // repetir la misma vidriera en dos pantallas. Da igual cuántos destacados
    // haya: acá nunca debe aparecer, y el grid tampoco debe disparar el fetch
    // separado (`destacado: true`) que antes alimentaba al carrusel.
    const destacados = [1, 2, 3, 4].map((id) => ({
      ...PRODUCTO,
      id,
      nombre: `Destacado ${id}`,
      destacado: true,
    }));
    productsApi.getProducts.mockResolvedValue(pagina(destacados));

    renderPagina();

    await screen.findByText("Destacado 1");
    expect(screen.queryByText("Hallazgos del día")).not.toBeInTheDocument();
    expect(productsApi.getProducts).not.toHaveBeenCalledWith(
      expect.objectContaining({ destacado: true }),
    );
  });

  it("muestra el botón de volver, visible también en mobile", async () => {
    renderPagina();

    const volver = await screen.findByRole("button", { name: /volver/i });
    expect(volver).toBeInTheDocument();
    // No debe estar oculto en mobile: la página es un destino de navegación
    // propio y quedarse sin salida en celular es el caso más frecuente.
    expect(volver.closest(".hidden")).toBeNull();
  });

  // Entrar directo a /coleccion (link compartido, sin historial previo) es el
  // caso que deja al usuario sin salida: `useVolver` detecta `location.key
  // === "default"` y cae al fallback en vez de sacarlo del sitio.
  it("si se entró directo por link, el botón de volver lleva a la home", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([]);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/coleccion"]}>
          <Routes>
            <Route path="/" element={<h1>Home editorial</h1>} />
            <Route path="/coleccion" element={<Coleccion />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await user.click(await screen.findByRole("button", { name: /volver/i }));

    expect(await screen.findByRole("heading", { name: "Home editorial" })).toBeInTheDocument();
  });

  it("no muestra el manifiesto de marca (es exclusivo de la home)", async () => {
    renderPagina();

    await screen.findByText("Reloj Clásico");
    expect(screen.queryByText("El Manifiesto YIMA")).not.toBeInTheDocument();
  });

  it("con el backend caído muestra el error de conexión, no el vacío 'Todavía no hay productos'", async () => {
    // Regresión FE-A2: el catch degradaba a lista vacía sin estado de error,
    // así que un backend caído se leía como "catálogo vacío" — mentira que
    // además invita a irse en vez de reintentar.
    productsApi.getProducts.mockRejectedValue(new Error("network down"));

    renderPagina();

    expect(await screen.findByText("No pudimos cargar los productos")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay productos")).not.toBeInTheDocument();
  });

  it("un fetch exitoso posterior limpia el estado de error", async () => {
    const user = userEvent.setup();
    productsApi.getProducts.mockRejectedValue(new Error("network down"));

    renderPagina();

    await screen.findByText("No pudimos cargar los productos");

    // El backend vuelve: el próximo fetch (disparado por un cambio de filtro)
    // tiene que reemplazar el error por el grid, no convivir con él.
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    await user.selectOptions(screen.getByLabelText("Categoría"), "1");

    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.queryByText("No pudimos cargar los productos")).not.toBeInTheDocument();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("Coleccion - mostrar m\u00e1s", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llamadasSetSearchParams.length = 0;
    categoriasApi.getCategorias.mockResolvedValue(CATEGORIAS);
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }], { total: 40, pageSize: 12 }));
  });

  it("no muestra ni bot\u00f3n ni contador cuando entra todo en la primera tanda", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));

    renderPagina();

    await screen.findByText("Reloj Cl\u00e1sico");
    expect(screen.queryByRole("button", { name: "Mostrar m\u00e1s" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Viste/)).not.toBeInTheDocument();
  });

  it("muestra el bot\u00f3n y el contador cuando hay m\u00e1s productos", async () => {
    renderPagina();

    await screen.findByText("Reloj Cl\u00e1sico");
    expect(screen.getByText("Viste 1 de 40 productos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar m\u00e1s" })).toBeInTheDocument();
  });

  it("Mostrar m\u00e1s pide la tanda siguiente, SUMA las cards y escribe ?paginas= con replace", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Cl\u00e1sico");

    productsApi.getProducts.mockResolvedValue(
      pagina([{ ...PRODUCTO, id: 2, nombre: "Reloj Deportivo" }], { total: 40 }),
    );
    llamadasSetSearchParams.length = 0;

    await user.click(screen.getByRole("button", { name: "Mostrar m\u00e1s" }));

    await screen.findByText("Reloj Deportivo");
    // La tanda nueva se SUMA debajo: la primera card sigue en pantalla.
    expect(screen.getByText("Reloj Cl\u00e1sico")).toBeInTheDocument();
    expect(productsApi.getProducts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: 12 }),
    );
    // Cargar m\u00e1s no es navegar: la tanda viaja a la URL con replace, para que
    // volver de una ficha restaure lo cargado sin apilar historial.
    expect(llamadasSetSearchParams.at(-1)).toEqual({ replace: true });
  });

  it("al volver con ?paginas= en la URL restaura todas las tandas en UN pedido", async () => {
    renderPagina("/coleccion?paginas=3");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, pageSize: 36 }),
      );
    });
  });

  it("las tandas heredadas NO se blanquean junto con los filtros", async () => {
    // Los filtros s\u00ed se resetean al entrar (decisi\u00f3n de producto), pero las
    // tandas tienen que sobrevivir o volver de una ficha perder\u00eda lo cargado.
    renderPagina("/coleccion?categoria=2&paginas=2");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "", pageSize: 24 }),
      );
    });
  });

  it("cambiar un filtro vuelve a la primera tanda", async () => {
    const user = userEvent.setup();
    renderPagina("/coleccion?paginas=3");

    await screen.findByText("Reloj Cl\u00e1sico");
    productsApi.getProducts.mockClear();

    await user.selectOptions(screen.getByLabelText("Categor\u00eda"), "1");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "1", pageSize: 12 }),
      );
    });
  });

  it("unas tandas fuera de rango se corrigen a las que existen de verdad", async () => {
    renderPagina("/coleccion?paginas=99");

    // 99 tandas pedir\u00edan 1188 productos: el fetch se topea en el m\u00e1ximo del
    // backend (100)...
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 }),
      );
    });
    // ...y con total 40 la URL se corrige a las 4 tandas reales, que
    // re-fetchean 48. Sin la correcci\u00f3n, "atr\u00e1s" volver\u00eda al 99 eterno.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 48 }),
      );
    });
  });
});

describe("Coleccion - limpiar filtros", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llamadasSetSearchParams.length = 0;
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    categoriasApi.getCategorias.mockResolvedValue(CATEGORIAS);
  });

  /**
   * Regresión con causa raíz verificada en navegador: "Limpiar" no borraba
   * NADA. El panel llamaba a los tres `onChange…` en el mismo tick, y
   * `setSearchParams` de react-router NO encola actualizaciones funcionales
   * como `useState` — cada llamada parte del mismo snapshot del render y gana
   * la última. Borrar `minPrecio` se perdía cuando la llamada siguiente
   * recalculaba desde ese snapshot viejo, y el `navigate` de la categoría
   * quedaba pisado. La URL terminaba idéntica a como estaba.
   *
   * Por eso el limpiado vive en el padre como UNA sola escritura al router, y
   * este test afirma sobre el fetch resultante (que es lo que la persona ve),
   * no sobre cuántas veces se llamó a un handler.
   */
  it("borra TODOS los filtros del panel de una vez, no sólo el último", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByLabelText("Categoría");
    await user.click(screen.getByRole("button", { name: /^filtros/i }));

    await user.type(screen.getByLabelText("Precio min."), "1000");
    await user.type(screen.getByLabelText("Precio máx."), "5000");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ minPrecio: "1000", maxPrecio: "5000" }),
      );
    });

    await user.click(screen.getByRole("button", { name: /limpiar/i }));

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoria: "", minPrecio: "", maxPrecio: "" }),
      );
    });
  });

  it("limpiar conserva la búsqueda libre en la ruta plana", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByLabelText("Categoría");
    await user.type(screen.getByLabelText("Buscar"), "reloj");
    await user.click(screen.getByRole("button", { name: /^filtros/i }));
    await user.type(screen.getByLabelText("Precio min."), "1000");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "reloj", minPrecio: "1000" }),
      );
    });

    await user.click(screen.getByRole("button", { name: /limpiar/i }));

    // El buscador está afuera del panel y sigue mostrando "reloj": borrarlo
    // haría desaparecer texto que la persona tiene a la vista.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "reloj", minPrecio: "" }),
      );
    });
  });
});

describe("Coleccion - escrituras de filtro en el mismo tick", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llamadasSetSearchParams.length = 0;
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    categoriasApi.getCategorias.mockResolvedValue(CATEGORIAS);
  });

  /**
   * Regresión verificada en navegador, ANTERIOR a la barra de filtros nueva:
   * cargar precio mínimo y máximo casi a la vez dejaba la URL en
   * `?maxPrecio=50000` — el mínimo desaparecía sin ningún error y el catálogo
   * quedaba filtrado por la mitad de lo que la persona pidió.
   *
   * Causa: `setSearchParams` NO encola actualizaciones funcionales como el
   * `setState` de React. Los dos campos de precio tienen debounces
   * independientes de 350 ms; si se completan casi juntos, los dos
   * temporizadores caen en el mismo lote, las dos llamadas reciben el MISMO
   * `prev` y gana la última.
   */
  it("no pierde un filtro cuando dos se commitean juntos", async () => {
    renderPagina();
    await screen.findByLabelText("Categoría");

    fireEvent.click(screen.getByRole("button", { name: /^filtros/i }));

    // Los dos cambios ocurren en el mismo tick a propósito: es la condición
    // exacta que dispara el pisoteo.
    fireEvent.change(screen.getByLabelText("Precio min."), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Precio máx."), { target: { value: "50000" } });

    await waitFor(
      () => {
        expect(productsApi.getProducts).toHaveBeenLastCalledWith(
          expect.objectContaining({ minPrecio: "1000", maxPrecio: "50000" }),
        );
      },
      { timeout: 3000 },
    );
  });
});
