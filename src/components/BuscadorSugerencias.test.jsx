import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProducts } from "../api/products.js";
import BuscadorSugerencias from "./BuscadorSugerencias.jsx";
import Navbar from "./Navbar.jsx";

vi.mock("../api/products.js", () => ({ getProducts: vi.fn() }));

const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

// Mismos mocks que usa Navbar.test.jsx: aísla la red de sus hooks para el
// test de colisión de nombre accesible, sin tocar el resto de esa suite.
vi.mock("../hooks/useCategoriasNavbar.js", () => ({
  default: () => ({ categorias: [], resuelto: true }),
}));
vi.mock("../hooks/usePerfilCliente.js", () => ({
  default: () => ({ perfil: null, resuelto: true, error: null }),
}));

function producto(extra = {}) {
  return {
    id: 1,
    nombre: "Producto de prueba",
    precio: "1000",
    categoria: { nombre: "Hogar" },
    fotos: [{ url: "http://x/1.jpg" }],
    ...extra,
  };
}

function renderBuscador() {
  return render(
    <MemoryRouter>
      <BuscadorSugerencias />
    </MemoryRouter>,
  );
}

describe("BuscadorSugerencias", () => {
  beforeEach(() => {
    getProducts.mockReset();
    navigateMock.mockReset();
  });

  it("no pide nada con menos de 2 caracteres", async () => {
    renderBuscador();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "a");
    await new Promise((r) => setTimeout(r, 250));
    expect(getProducts).not.toHaveBeenCalled();
  });

  it("debounce: espera antes de pedir, y pide como mucho 5", async () => {
    vi.useFakeTimers();
    // `fireEvent.change` y no `userEvent.type`: bajo timers falsos,
    // `userEvent` espera con su propio `setTimeout` interno, que
    // `vi.useFakeTimers()` deja colgado para siempre (cuelga el test aunque
    // se le pase `advanceTimers` — reproducido en aislamiento contra esta
    // versión de user-event/vitest). `fireEvent` es síncrono y no depende de
    // ningún timer propio.
    getProducts.mockResolvedValue({ data: [producto()], total: 1 });
    renderBuscador();
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), {
      target: { value: "lampara" },
    });
    expect(getProducts).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(300);
    expect(getProducts).toHaveBeenCalledWith(expect.objectContaining({ search: "lampara", pageSize: 5 }));
    vi.useRealTimers();
  });

  it("muestra hasta 5 productos con miniatura, categoría y precio", async () => {
    getProducts.mockResolvedValue({
      data: [producto({ nombre: "Lámpara Moon" })],
      total: 1,
    });
    renderBuscador();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");

    expect(await screen.findByText("Lámpara Moon")).toBeInTheDocument();
    expect(screen.getByText("Hogar")).toBeInTheDocument();
    expect(screen.getByText("$ 1.000")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Lámpara Moon" })).toHaveAttribute("src", "http://x/1.jpg");
  });

  it("'Ver todos los resultados' navega a /coleccion?search=", async () => {
    getProducts.mockResolvedValue({ data: [producto()], total: 12 });
    renderBuscador();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");

    const link = await screen.findByRole("link", { name: /ver todos los resultados/i });
    expect(link).toHaveAttribute("href", "/coleccion?search=lampara");
  });

  it("Enter hace lo mismo que 'ver todos'", async () => {
    getProducts.mockResolvedValue({ data: [producto()], total: 1 });
    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });
    await userEvent.type(input, "lampara{Enter}");

    expect(navigateMock).toHaveBeenCalledWith("/coleccion?search=lampara");
  });

  it("Escape cierra las sugerencias", async () => {
    getProducts.mockResolvedValue({ data: [producto()], total: 1 });
    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });
    await userEvent.type(input, "lampara");
    await screen.findByRole("listbox");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("distingue 'no hay resultados' de 'falló la carga'", async () => {
    getProducts.mockResolvedValue({ data: [], total: 0 });
    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });
    await userEvent.type(input, "zzz");
    expect(await screen.findByText(/no encontramos productos/i)).toBeInTheDocument();

    getProducts.mockRejectedValueOnce(new Error("network down"));
    await userEvent.clear(input);
    await userEvent.type(input, "www");
    expect(await screen.findByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
  });

  it("ignora una respuesta vieja que llega después de la más nueva", async () => {
    vi.useFakeTimers();
    let resolverLenta;
    let resolverRapida;
    getProducts
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverLenta = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverRapida = resolve;
          }),
      );

    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });

    fireEvent.change(input, { target: { value: "lam" } });
    await vi.advanceTimersByTimeAsync(300);
    fireEvent.change(input, { target: { value: "lampara" } });
    await vi.advanceTimersByTimeAsync(300);

    // La segunda búsqueda ("lampara") resuelve PRIMERO en la red; la primera
    // ("lam"), más lenta, resuelve después y no tiene que pisar el resultado.
    resolverRapida({ data: [producto({ nombre: "Resultado nuevo" })], total: 1 });
    await vi.advanceTimersByTimeAsync(0);
    resolverLenta({ data: [producto({ nombre: "Resultado viejo" })], total: 1 });
    await vi.advanceTimersByTimeAsync(0);

    vi.useRealTimers();
    expect(await screen.findByText("Resultado nuevo")).toBeInTheDocument();
    expect(screen.queryByText("Resultado viejo")).not.toBeInTheDocument();
  });

  it("el input usa 16px para evitar el zoom de iOS en Safari", () => {
    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });
    expect(input.className).toContain("text-[16px]");
  });

  it("su nombre accesible NO colisiona con 'Buscar productos' del Navbar", () => {
    render(
      <MemoryRouter>
        <Navbar />
        <BuscadorSugerencias />
      </MemoryRouter>,
    );

    expect(screen.getAllByLabelText("Buscar productos")).toHaveLength(1);
    expect(screen.getByRole("searchbox", { name: "Buscar en el catálogo" })).toBeInTheDocument();
  });
});
