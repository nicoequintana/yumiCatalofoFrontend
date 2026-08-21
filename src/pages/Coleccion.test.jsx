import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
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
function renderPagina(ruta = "/coleccion") {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={[ruta]}>
        <Coleccion />
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
      });
    });
  });

  it("cambiar la categoría actualiza la URL y refetch con el filtro", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Reloj Clásico");
    productsApi.getProducts.mockClear();

    const select = screen.getByLabelText("Categoría");
    await user.selectOptions(select, "1");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "1" }),
      );
    });
  });

  it("cambiar un filtro usa { replace: true } para no apilar historial", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Reloj Clásico");
    llamadasSetSearchParams.length = 0;

    const select = screen.getByLabelText("Categoría");
    await user.selectOptions(select, "1");

    await waitFor(() => {
      expect(llamadasSetSearchParams.length).toBeGreaterThan(0);
    });
    expect(llamadasSetSearchParams.every((opts) => opts?.replace === true)).toBe(true);
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

  it("no muestra los destacados si hay menos de 4 productos destacados", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO, destacado: true }]));
    renderPagina();

    await screen.findByText("Reloj Clásico");
    expect(screen.queryByText("Hallazgos del día")).not.toBeInTheDocument();
  });

  it("muestra el carrusel con los destacados globales, con su propio fetch sin filtros", async () => {
    const destacados = [1, 2, 3, 4].map((id) => ({
      ...PRODUCTO,
      id,
      nombre: `Destacado ${id}`,
      destacado: true,
    }));
    productsApi.getProducts.mockResolvedValue(pagina(destacados));

    renderPagina();

    expect(await screen.findByText("Hallazgos del día")).toBeInTheDocument();
    // El carrusel pide los destacados al backend con su propio `pageSize`, y
    // separado del fetch del grid que sí lleva los filtros y la página.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({ destacado: true, pageSize: 12 });
    });
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

  afterEach(() => {
    vi.useRealTimers();
  });
});

describe("Coleccion - paginador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llamadasSetSearchParams.length = 0;
    categoriasApi.getCategorias.mockResolvedValue(CATEGORIAS);
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }], { total: 40, pageSize: 12 }));
  });

  it("no muestra el paginador cuando entra todo en una p\u00e1gina", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));

    renderPagina();

    await screen.findByText("Reloj Cl\u00e1sico");
    expect(screen.queryByRole("navigation", { name: /paginaci\u00f3n/i })).not.toBeInTheDocument();
  });

  it("muestra el paginador con el total de p\u00e1ginas derivado de total/pageSize", async () => {
    renderPagina();

    expect(
      await screen.findByRole("navigation", { name: "Paginaci\u00f3n de la colecci\u00f3n" }),
    ).toBeInTheDocument();
    // 40 productos / 12 por p\u00e1gina = 4 p\u00e1ginas.
    expect(screen.getByText("P\u00e1gina 1 de 4")).toBeInTheDocument();
  });

  it("respeta la p\u00e1gina que viene en la URL (un link a la p\u00e1gina 3 abre la p\u00e1gina 3)", async () => {
    renderPagina("/coleccion?page=3");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
    });
    expect(await screen.findByText("P\u00e1gina 3 de 4")).toBeInTheDocument();
  });

  it("la p\u00e1gina heredada NO se blanquea junto con los filtros", async () => {
    // Los filtros s\u00ed se resetean al entrar (decisi\u00f3n de producto), pero la
    // p\u00e1gina tiene que sobrevivir o un link compartido a la p\u00e1gina 3 abrir\u00eda
    // siempre la 1.
    renderPagina("/coleccion?categoria=2&page=3");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "", page: 3 }),
      );
    });
  });

  it("cambiar de p\u00e1gina escribe ?page en la URL y refetch", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("P\u00e1gina 1 de 4");
    productsApi.getProducts.mockClear();

    await user.click(screen.getByRole("button", { name: "P\u00e1gina 2" }));

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it("cambiar un filtro vuelve a la p\u00e1gina 1", async () => {
    const user = userEvent.setup();
    renderPagina("/coleccion?page=3");

    await screen.findByText("P\u00e1gina 3 de 4");
    productsApi.getProducts.mockClear();

    await user.selectOptions(screen.getByLabelText("Categor\u00eda"), "1");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: "1", page: 1 }),
      );
    });
  });

  it("corrige una p\u00e1gina fuera de rango a la \u00faltima que existe", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([], { total: 40, pageSize: 12 }));

    renderPagina("/coleccion?page=99");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(expect.objectContaining({ page: 4 }));
    });
  });
});
