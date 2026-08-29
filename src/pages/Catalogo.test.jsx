import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import Catalogo from "./Catalogo.jsx";
import Coleccion from "./Coleccion.jsx";
import * as productsApi from "../api/products.js";
import * as categoriasApi from "../api/categorias.js";

vi.mock("../api/products.js");
vi.mock("../api/categorias.js");

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
};

function renderPagina() {
  return render(
    <StrictMode>
      <MemoryRouter initialEntries={["/"]}>
        <Catalogo />
      </MemoryRouter>
    </StrictMode>,
  );
}

/**
 * Sobre de página que devuelve `GET /products`. Los tests declaran las filas y
 * el helper arma el `{ data, page, pageSize, total }` alrededor.
 */
function pagina(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 12, total: filas.length, ...extra };
}

describe("Catalogo - home editorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
    // La home monta `CategoriasDestacadas`, que pide las categorías. Sin este
    // default el auto-mock devuelve `undefined` y el hook revienta con un
    // `undefined.then(...)` síncrono dentro del efecto — un artefacto de la
    // harness, no del producto: la API real siempre devuelve una promesa.
    // Cada test que necesite categorías concretas pisa este valor.
    categoriasApi.getCategorias.mockResolvedValue([]);
  });

  it("muestra el hero con el copy de marca", () => {
    renderPagina();

    // El texto del eyebrow va en minúsculas en el DOM y lo pasa a mayúsculas el
    // CSS (`uppercase`). Es a propósito: el aserto —y un lector de pantalla—
    // leen la cadena legible, no una versión gritada.
    expect(screen.getByText("Útiles • Innovadores • Para tu día a día")).toBeInTheDocument();

    // El acento cromático de "más fácil." es un <span> DENTRO del <h1>, así que
    // el nombre accesible sigue siendo la frase entera. Este aserto es lo que
    // detectaría que alguien parta el titular en dos encabezados.
    expect(
      screen.getByRole("heading", {
        name: "Descubrí cosas que te hacen la vida más fácil.",
        level: 1,
      }),
    ).toBeInTheDocument();
  });

  it("el hero tiene UN solo CTA, que navega a /coleccion", () => {
    renderPagina();

    // Nombre por regex y no por igualdad: el link lleva un ícono de flecha
    // adentro, y atarse al texto exacto rompería el test si el ícono cambia de
    // nombre o de posición.
    expect(screen.getByRole("link", { name: /ver productos/i })).toHaveAttribute(
      "href",
      "/coleccion",
    );

    // El mockup traía un segundo botón ("Explorar ahora") al MISMO destino. Se
    // quitó por pedido explícito: dos acciones idénticas no son jerarquía. Este
    // aserto existe para que no vuelva a colarse.
    expect(screen.queryByRole("link", { name: /explorar ahora/i })).not.toBeInTheDocument();
  });

  // Las señales de confianza se renderizan DOS veces (fila en escritorio,
  // tarjeta flotante en móvil) porque viven en columnas distintas del grid y no
  // hay forma de mover un solo nodo entre ellas. En un navegador solo una está
  // visible; en jsdom no hay CSS, así que las dos están en el DOM. Este test
  // fija esa duplicación a propósito: si alguien la "arregla" dejando un solo
  // nodo, o si las dos copias se separan, falla acá y no en producción.
  it("las señales de confianza se renderizan en sus dos variantes con el mismo origen", () => {
    renderPagina();

    // Un ítem sin variante compacta aparece igual en las dos.
    expect(screen.getAllByText("Diferentes")).toHaveLength(2);

    // Etiqueta larga (fila de escritorio) y corta (tarjeta móvil) del mismo ítem.
    expect(screen.getByText("Para vos o para regalar")).toBeInTheDocument();
    expect(screen.getByText("Para regalar")).toBeInTheDocument();

    // `soloEscritorio`: el ítem más largo no entra en la tarjeta de un teléfono
    // sin partirla en dos renglones, así que aparece UNA sola vez. Si alguien
    // saca ese flag "por consistencia", este aserto lo detiene.
    expect(screen.getAllByText("Productos seleccionados")).toHaveLength(1);
  });

  // Complementa al test de `href` de arriba: ese sólo mira el atributo, así
  // que no detectaría que el link dejara de navegar de verdad (ej. si el
  // `Link` volviera a ser un `<a>` común con recarga completa, o si la ruta
  // no estuviera registrada). Antes de la separación esto era un scroll
  // dentro de la misma página; ahora es navegación entre rutas, que tiene
  // más formas de romperse.
  it("clickear el botón del hero renderiza la página de colección", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([]);

    render(
      <StrictMode>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<Catalogo />} />
            <Route path="/coleccion" element={<Coleccion />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    );

    await user.click(screen.getByRole("link", { name: /ver productos/i }));

    // Contenido propio de /coleccion, que la home ya no renderiza.
    expect(await screen.findByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Todos los productos" })).toBeInTheDocument();
    expect(screen.queryByText("El Manifiesto YIMA")).not.toBeInTheDocument();
  });

  it("muestra el bloque de manifiesto de marca", () => {
    renderPagina();

    expect(screen.getByText("El Manifiesto YIMA")).toBeInTheDocument();
  });

  it("no renderiza la barra de filtros ni el grid de productos", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalled();
    });

    expect(screen.queryByLabelText("Categoría")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Buscar")).not.toBeInTheDocument();
    expect(screen.queryByText("Todos los productos")).not.toBeInTheDocument();
  });

  it("el carrusel pide los destacados filtrados en el backend", async () => {
    renderPagina();

    // `pageSize` es el techo del carrusel, no su medida exacta: cuantos más
    // destacados haya, más largo es el recorrido antes de repetirse. Está
    // separado del mínimo de 4 con que se muestra la sección.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({ destacado: true, pageSize: 12 });
    });
  });

  it("no muestra los destacados si hay menos de 4 productos destacados", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO, destacado: true }]));
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalled();
    });
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
});
