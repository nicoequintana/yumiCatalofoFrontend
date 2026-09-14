import { StrictMode } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Catalogo from "./Catalogo.jsx";
import Coleccion from "./Coleccion.jsx";
import * as productsApi from "../api/products.js";
import * as categoriasApi from "../api/categorias.js";
import * as promocionesApi from "../api/promociones.js";
import * as configApi from "../api/config.js";

vi.mock("../api/products.js");
vi.mock("../api/categorias.js");
vi.mock("../api/promociones.js");
vi.mock("../api/config.js");

// El carrusel de campañas reemplazó al banner: `useContextoComercial` se
// mockea para no depender de una request real, mismo patrón que
// `Footer.test.jsx`.
const contextoMock = vi.fn();
vi.mock("../hooks/useContextoComercial.js", () => ({ default: () => contextoMock() }));

const TITULO_HERO = "Objetos singulares que transforman tu cotidiano.";

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
};

const SLIDE_CAMPANIA = {
  tipo: "CAMPANIA",
  campaniaId: 7,
  titulo: "Primavera YIMA",
  texto: null,
  ctaDestino: null,
  arteUrl: null,
  doodleUrl: null,
};

function renderPagina() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={["/"]}>
        <ToastProvider>
          <Catalogo />
        </ToastProvider>
      </MemoryRouter>
    </StrictMode>,
  );
}

/**
 * Renderiza la home y espera a que el loader de carga inicial se levante.
 *
 * La home se tapa con un velo hasta que sus fuentes resuelven (ver
 * `Catalogo.carga.test.jsx`), así que NINGÚN aserto sobre el contenido puede
 * ser síncrono: el primer render solo tiene el spinner. El `<h1>` del hero es
 * la señal de que el velo se levantó — la página se dibuja entera de una vez.
 */
async function renderPaginaLista() {
  const utils = renderPagina();
  await screen.findByRole("heading", { level: 1 });
  return utils;
}

/**
 * Sobre de página que devuelve `GET /products`. Los tests declaran las filas y
 * el helper arma el `{ data, page, pageSize, total }` alrededor.
 */
function pagina(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 12, total: filas.length, ...extra };
}

/** La `<section>` del hero: el ancestro más cercano del único `<h1>`. */
function seccionHero() {
  return screen.getByRole("heading", { level: 1 }).closest("[data-seccion-home]");
}

describe("Catalogo - home editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    productsApi.getProductosMasVendidos.mockResolvedValue(pagina([]));
    promocionesApi.getPromocionDestacada.mockResolvedValue(null);
    configApi.getConfiguracionHome.mockResolvedValue({ productoIcono: null });
    // La home monta `CirculosCategoria`, que pide las categorías. Sin este
    // default el auto-mock devuelve `undefined` y el hook revienta con un
    // `undefined.then(...)` síncrono dentro del efecto — un artefacto de la
    // harness, no del producto: la API real siempre devuelve una promesa.
    // Cada test que necesite categorías concretas pisa este valor.
    categoriasApi.getCategorias.mockResolvedValue([]);
    // Default sin campañas: el carrusel no dibuja nada, mismo estado inicial
    // que el catálogo real sin contexto comercial cargado.
    contextoMock.mockReturnValue({
      slides: [],
      modal: null,
      doodle: null,
      claveDia: null,
      resuelto: true,
    });
  });

  it("en el DOM hay un solo h1, con el copy del hero", async () => {
    await renderPaginaLista();

    const encabezados = screen.getAllByRole("heading", { level: 1 });
    expect(encabezados).toHaveLength(1);
    expect(encabezados[0]).toHaveTextContent(TITULO_HERO);
  });

  it("muestra el eyebrow y el párrafo del hero", async () => {
    await renderPaginaLista();

    const hero = seccionHero();
    // El eyebrow va en caja normal en el DOM y lo pasa a mayúsculas el CSS: el
    // aserto —y un lector de pantalla— leen la cadena legible.
    expect(within(hero).getByText("Edición curada · Temporada 2026")).toBeInTheDocument();
    expect(
      within(hero).getByText(
        "Una selección táctil y funcional para el bienestar de la casa, la pausa y los rituales de todos los días. Cada pieza, elegida una por una.",
      ),
    ).toBeInTheDocument();
  });

  it("el hero tiene UN solo CTA, que navega a /coleccion", async () => {
    await renderPaginaLista();

    const hero = seccionHero();
    const links = within(hero).getAllByRole("link");
    expect(links).toHaveLength(1);
    // Regex y no igualdad: el link lleva un ícono de flecha adentro.
    expect(links[0]).toHaveAccessibleName(/ver todo el catálogo/i);
    expect(links[0]).toHaveAttribute("href", "/coleccion");
  });

  it("las señales de confianza YA NO viven en el hero", async () => {
    await renderPaginaLista();

    expect(screen.queryByText("Productos seleccionados")).not.toBeInTheDocument();
    expect(screen.queryByText("Para vos o para regalar")).not.toBeInTheDocument();
    expect(screen.queryByText("Para regalar")).not.toBeInTheDocument();
  });

  it("el hero no carga ninguna foto", async () => {
    await renderPaginaLista();

    expect(within(seccionHero()).queryByRole("img")).toBeNull();
  });

  // jsdom no aplica CSS: lo que se fija es el markup del que depende el orden
  // visual. `order-last` lo manda al pie en mobile y `md:order-none` lo devuelve
  // a su lugar del DOM (después de las campañas) en escritorio.
  it("el hero va al pie en mobile y vuelve a su lugar en escritorio, con CSS order", async () => {
    const { container } = await renderPaginaLista();

    const columna = seccionHero().parentElement;
    expect(columna).toHaveClass("flex", "flex-col");
    expect(seccionHero()).toHaveClass("order-last", "md:order-none");
    // Todas las secciones son hermanas del hero: `order` solo reordena hijos
    // directos del contenedor flex.
    expect(container.querySelectorAll("[data-seccion-home]")).toHaveLength(columna.children.length);
    // `Layout.jsx` ya pone el `<main>`: la página no anida otro.
    expect(container.querySelector("main")).toBeNull();
  });

  it("el buscador de la home solo existe por debajo de lg, donde el header no tiene el suyo", async () => {
    const { container } = await renderPaginaLista();

    const envoltorio = container.querySelector('[data-seccion-home="buscador-mobile"]');
    expect(envoltorio).toHaveClass("lg:hidden");
    expect(
      within(envoltorio).getByRole("searchbox", { name: "Buscar en el catálogo" }),
    ).toBeInTheDocument();
  });

  it("el orden en el DOM es: campañas, hero, buscador, círculos, promos, más vendidos, ícono, nuevos, destacados, confianza", async () => {
    const { container } = await renderPaginaLista();

    const secciones = [...container.querySelectorAll("[data-seccion-home]")].map(
      (el) => el.dataset.seccionHome,
    );
    expect(secciones).toEqual([
      "campanias",
      "hero",
      "buscador-mobile",
      "circulos",
      "promos",
      "mas-vendidos",
      "producto-icono",
      "nuevos-ingresos",
      "destacados",
      "confianza",
    ]);
  });

  it("monta las tarjetas de confianza", async () => {
    await renderPaginaLista();

    expect(screen.getByRole("heading", { name: "Envíos a todo el país" })).toBeInTheDocument();
  });

  it("pasa la promo destacada a PromosActivas", async () => {
    promocionesApi.getPromocionDestacada.mockResolvedValue({
      id: 3,
      nombre: "Semana del Hogar",
      finVigencia: new Date(Date.now() + 3_600_000).toISOString(),
      productos: [{ ...PRODUCTO, id: 9, nombre: "Lámpara en promo" }],
    });

    await renderPaginaLista();

    expect(await screen.findByRole("heading", { level: 2, name: "Semana del Hogar" })).toBeInTheDocument();
  });

  it("pasa los más vendidos a su sección", async () => {
    productsApi.getProductosMasVendidos.mockResolvedValue(
      pagina([1, 2, 3, 4].map((id) => ({ ...PRODUCTO, id, nombre: `Vendido ${id}` }))),
    );

    await renderPaginaLista();

    expect(await screen.findByRole("heading", { level: 2, name: "Más vendidos" })).toBeInTheDocument();
  });

  // Complementa al test de `href`: ese sólo mira el atributo, así que no
  // detectaría que el link dejara de navegar de verdad (ej. si el `Link`
  // volviera a ser un `<a>` común con recarga completa, o si la ruta no
  // estuviera registrada).
  it("clickear el botón del hero renderiza la página de colección", async () => {
    const user = userEvent.setup();

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Catalogo />} />
              <Route path="/coleccion" element={<Coleccion />} />
            </Routes>
          </ToastProvider>
        </MemoryRouter>
      </StrictMode>,
    );

    // `findBy`: la home arranca tapada por el loader de carga inicial.
    await user.click(await screen.findByRole("link", { name: /ver todo el catálogo/i }));

    // Contenido propio de /coleccion, que la home no renderiza.
    expect(await screen.findByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Todos los productos" })).toBeInTheDocument();
    expect(screen.queryByText("El Manifiesto YIMA")).not.toBeInTheDocument();
  });

  it("el manifiesto no se renderiza", async () => {
    await renderPaginaLista();

    expect(screen.queryByText("El Manifiesto YIMA")).toBeNull();
  });

  it("no renderiza la barra de filtros ni el grid de productos", async () => {
    await renderPaginaLista();

    expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar")).not.toBeInTheDocument();
    expect(screen.queryByText("Todos los productos")).not.toBeInTheDocument();
  });

  it("el carrusel pide los destacados filtrados en el backend", async () => {
    renderPagina();

    // `pageSize` es el techo del carrusel, no su medida exacta.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({ destacado: true, pageSize: 12 });
    });
  });

  it("no muestra los destacados si hay menos de 4 productos destacados", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO, destacado: true }]));
    await renderPaginaLista();

    expect(screen.queryByText("Hallazgos del día")).not.toBeInTheDocument();
  });

  it("muestra el carrusel cuando hay al menos 4 destacados", async () => {
    const destacados = [1, 2, 3, 4].map((id) => ({
      ...PRODUCTO,
      id,
      nombre: `Destacado ${id}`,
      destacado: true,
    }));
    productsApi.getProducts.mockResolvedValue(pagina(destacados));

    renderPagina();

    expect(await screen.findByText("Hallazgos del día")).toBeInTheDocument();
  });

  it("muestra el carrusel de campañas", async () => {
    contextoMock.mockReturnValue({
      slides: [SLIDE_CAMPANIA],
      modal: null,
      doodle: null,
      claveDia: "2026-09-05",
      resuelto: true,
    });

    renderPagina();

    expect(await screen.findByText("Primavera YIMA")).toBeInTheDocument();
  });

  it("sin slides, la home no dibuja el carrusel", async () => {
    await renderPaginaLista();

    expect(screen.queryByRole("region", { name: "Campañas y ofertas" })).toBeNull();
  });
});
