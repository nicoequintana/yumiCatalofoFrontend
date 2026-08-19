import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

const CATEGORIAS = [
  { id: 1, nombre: "Relojes", cantidadProductos: 2 },
  { id: 2, nombre: "Anillos", cantidadProductos: 1 },
];

function renderPagina(ruta = "/coleccion") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Coleccion />
    </MemoryRouter>,
  );
}

describe("Coleccion - filtros y grid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llamadasSetSearchParams.length = 0;
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO }]);
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
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO }]);
    renderPagina();

    await screen.findByText("Reloj Clásico");

    productsApi.getProducts.mockResolvedValue([]);
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

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        categoria: "",
        search: "",
        minPrecio: "",
        maxPrecio: "",
      });
    });
  });

  it("no muestra el bento de destacados si hay menos de 4 productos destacados", async () => {
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO, destacado: true }]);
    renderPagina();

    await screen.findByText("Reloj Clásico");
    expect(screen.queryByText("Hallazgos del día")).not.toBeInTheDocument();
  });

  it("muestra el bento con los destacados globales, con su propio fetch sin filtros", async () => {
    const destacados = [1, 2, 3, 4].map((id) => ({
      ...PRODUCTO,
      id,
      nombre: `Destacado ${id}`,
      destacado: true,
    }));
    productsApi.getProducts.mockResolvedValue(destacados);

    renderPagina();

    expect(await screen.findByText("Hallazgos del día")).toBeInTheDocument();
    // El bento pide productos sin filtros (objeto vacío), separado del
    // fetch del grid que sí lleva los cuatro filtros.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({});
    });
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
