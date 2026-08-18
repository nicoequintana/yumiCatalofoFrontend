import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import Catalogo from "./Catalogo.jsx";
import * as productsApi from "../api/products.js";
import * as categoriasApi from "../api/categorias.js";

vi.mock("../api/products.js");
vi.mock("../api/categorias.js");

// Spy that records every setSearchParams(next, options) call made through
// react-router-dom's real useSearchParams, so we can assert Catalogo.jsx
// passes { replace: true } on every filter change — without this, v7's
// default push behavior stacks one browser-history entry per filter tweak.
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
  disponibilidad: "DISPONIBLE",
};

const CATEGORIAS = [
  { id: 1, nombre: "Relojes", cantidadProductos: 2 },
  { id: 2, nombre: "Anillos", cantidadProductos: 1 },
];

function renderPagina(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Catalogo />
    </MemoryRouter>,
  );
}

describe("Catalogo - filtros", () => {
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
    expect(screen.getByLabelText("Disponibilidad")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio min.")).toBeInTheDocument();
    expect(screen.getByLabelText("Precio máx.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Relojes" })).toBeInTheDocument();
    });
  });

  it("hace fetch inicial sin filtros", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        categoria: "",
        search: "",
        minPrecio: "",
        maxPrecio: "",
        disponibilidad: "",
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

  it("cambiar disponibilidad refetch con el filtro correcto", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Reloj Clásico");
    productsApi.getProducts.mockClear();

    const select = screen.getByLabelText("Disponibilidad");
    await user.selectOptions(select, "AGOTADO");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ disponibilidad: "AGOTADO" }),
      );
    });
  });

  it("muestra el estado vacío 'Sin resultados' cuando no hay coincidencias con filtros", async () => {
    const user = userEvent.setup();
    productsApi.getProducts.mockResolvedValue([{ ...PRODUCTO }]);
    renderPagina();

    await screen.findByText("Reloj Clásico");

    productsApi.getProducts.mockResolvedValue([]);
    const select = screen.getByLabelText("Disponibilidad");
    await user.selectOptions(select, "AGOTADO");

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

    // Not yet — debounce hasn't elapsed.
    expect(productsApi.getProducts).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    vi.useRealTimers();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: "reloj" }),
      );
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
