import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  // Restaura los timers reales en un solo lugar: un `vi.useRealTimers()`
  // inline al final de cada test que usa `vi.useFakeTimers()` NUNCA corre si
  // una `expect` anterior en el mismo test tira — y esa pérdida de timers
  // reales se le queda pegada al PRÓXIMO test del archivo, que puede fallar
  // sin que nada en su propio código esté mal.
  afterEach(() => {
    vi.useRealTimers();
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

    // Este `useRealTimers()` NO es el cleanup de fin de test (ese quedó en el
    // `afterEach` de arriba, para que sobreviva a un `expect` que tire antes
    // de esta línea): `findByText` pollea con `setTimeout` real por dentro, y
    // bajo timers falsos ese poll nunca corre — el test cuelga hasta el
    // timeout de Vitest en vez de fallar por lo que afirma. Verificado:
    // sacarlo cuelga este test a los 5000ms.
    vi.useRealTimers();
    expect(await screen.findByText("Resultado nuevo")).toBeInTheDocument();
    expect(screen.queryByText("Resultado viejo")).not.toBeInTheDocument();
  });

  it("una respuesta en vuelo no reabre el dropdown si el término ya bajó de 2 caracteres (M1)", async () => {
    // Bug: la rama "<2 caracteres" no bumpeaba `pedidoIdRef`, así que un
    // pedido ya en vuelo cuando se borra el término llegaba con el MISMO id
    // de pedido que sigue vigente y reabría el dropdown que el usuario ya
    // cerró al borrar.
    vi.useFakeTimers();
    let resolver;
    getProducts.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolver = resolve;
        }),
    );

    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });

    fireEvent.change(input, { target: { value: "lam" } });
    await vi.advanceTimersByTimeAsync(300); // dispara el pedido, todavía sin resolver

    fireEvent.change(input, { target: { value: "l" } }); // <2: cierra sin pedir nada nuevo

    await act(async () => {
      resolver({ data: [producto()], total: 1 });
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  describe("cierre al salir del componente", () => {
    function renderConVecino() {
      return render(
        <MemoryRouter>
          <BuscadorSugerencias />
          <button type="button">Afuera</button>
        </MemoryRouter>,
      );
    }

    it("un click fuera cierra las sugerencias", async () => {
      getProducts.mockResolvedValue({ data: [producto()], total: 1 });
      renderConVecino();
      await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
      await screen.findByRole("listbox");

      await userEvent.click(screen.getByRole("button", { name: "Afuera" }));

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("un click DENTRO de las sugerencias no las cierra antes de tiempo", async () => {
      getProducts.mockResolvedValue({ data: [producto({ nombre: "Lámpara Moon" })], total: 1 });
      renderConVecino();
      await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
      const listbox = await screen.findByRole("listbox");

      await userEvent.pointer({ keys: "[MouseLeft>]", target: listbox });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("cuando el foco sale del componente, se cierran", async () => {
      getProducts.mockResolvedValue({ data: [producto()], total: 1 });
      renderConVecino();
      await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
      await screen.findByRole("listbox");

      act(() => screen.getByRole("button", { name: "Afuera" }).focus());

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("tabular del input a una sugerencia NO las cierra", async () => {
      getProducts.mockResolvedValue({ data: [producto({ nombre: "Lámpara Moon" })], total: 1 });
      renderConVecino();
      await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
      await screen.findByRole("listbox");

      await userEvent.tab();

      expect(screen.getByRole("option", { name: /lámpara moon/i })).toHaveFocus();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });
  });

  describe("variante", () => {
    it("por defecto el panel de sugerencias mide lo mismo que el campo", async () => {
      getProducts.mockResolvedValue({ data: [producto()], total: 1 });
      renderBuscador();
      await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
      const listbox = await screen.findByRole("listbox");

      expect(listbox).toHaveClass("inset-x-0");
      expect(listbox).not.toHaveClass("w-[380px]");
    });

    it('variante="header": panel propio de 380px alineado a la derecha del campo', async () => {
      getProducts.mockResolvedValue({ data: [producto()], total: 1 });
      render(
        <MemoryRouter>
          <BuscadorSugerencias variante="header" />
        </MemoryRouter>,
      );
      await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
      const listbox = await screen.findByRole("listbox");

      expect(listbox).toHaveClass("right-0", "w-[380px]");
      expect(listbox).not.toHaveClass("inset-x-0");
    });
  });

  it("al desmontarse con el dropdown abierto, quita el listener de click afuera", async () => {
    getProducts.mockResolvedValue({ data: [producto()], total: 1 });
    const quitar = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderBuscador();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar en el catálogo" }), "lampara");
    await screen.findByRole("listbox");
    quitar.mockClear();

    unmount();

    expect(quitar).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    quitar.mockRestore();
  });

  it("el input usa 16px para evitar el zoom de iOS en Safari", () => {
    renderBuscador();
    const input = screen.getByRole("searchbox", { name: "Buscar en el catálogo" });
    expect(input.className).toContain("text-[16px]");
  });

  // Desde T12 el Navbar ya monta este buscador adentro (escritorio), así que
  // alcanza con renderizar el Navbar solo: los dos conviven en el mismo árbol.
  it("su nombre accesible NO colisiona con 'Buscar productos' del Navbar", () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    expect(screen.getAllByLabelText("Buscar productos")).toHaveLength(1);
    expect(screen.getByRole("searchbox", { name: "Buscar en el catálogo" })).toBeInTheDocument();
  });
});
