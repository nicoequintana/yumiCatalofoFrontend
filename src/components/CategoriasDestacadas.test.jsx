import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CategoriasDestacadas from "./CategoriasDestacadas.jsx";
import * as categoriasApi from "../api/categorias.js";

vi.mock("../api/categorias.js");

function renderSeccion() {
  return render(
    <MemoryRouter>
      <CategoriasDestacadas />
    </MemoryRouter>,
  );
}

function categoria(nombre, { id = nombre.length, destacada = true, orden = 0, imagenUrl = null } = {}) {
  return {
    id,
    nombre,
    cantidadProductos: 5,
    cantidadPublicados: 5,
    destacadaEnHome: destacada,
    ordenHome: orden,
    imagenUrl,
  };
}

describe("CategoriasDestacadas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra sólo las categorías que el panel marcó, en el orden que eligió", async () => {
    // El orden lo decide `ordenHome`, no la cantidad de productos ni el
    // alfabético: la sección es una selección editorial del admin.
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Cocina", { id: 1, orden: 2 }),
      categoria("Hogar", { id: 2, orden: 0 }),
      categoria("Juguetes", { id: 3, destacada: false }),
      categoria("Iluminación", { id: 4, orden: 1 }),
    ]);

    renderSeccion();

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    });

    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Hogar",
      "Iluminación",
      "Cocina",
    ]);
    expect(screen.queryByText("Juguetes")).not.toBeInTheDocument();
  });

  it("no muestra más de tres aunque lleguen más marcadas", async () => {
    // El tope real lo aplica el backend (400 al marcar una cuarta). Esto es la
    // red por si alguna vez llegan más —una escritura a mano en la base, un
    // backend viejo—: la home muestra las primeras en vez de crecer sola.
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("A", { id: 1, orden: 0 }),
      categoria("B", { id: 2, orden: 1 }),
      categoria("C", { id: 3, orden: 2 }),
      categoria("D", { id: 4, orden: 3 }),
    ]);

    renderSeccion();

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
    });
    expect(screen.queryByText("D")).not.toBeInTheDocument();
  });

  it("desempata por nombre para que el orden no cambie entre visitas", async () => {
    // `ordenHome` lo reescribe entera la operación de reordenar, así que no se
    // asume sin repetidos.
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Zapatos", { id: 1, orden: 0 }),
      categoria("Almohadas", { id: 2, orden: 0 }),
    ]);

    renderSeccion();

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(2);
    });
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Almohadas",
      "Zapatos",
    ]);
  });

  it("el CTA lleva al catálogo ya filtrado por esa categoría", async () => {
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cuidado Personal", { id: 7 })]);

    renderSeccion();

    const cta = await screen.findByRole("link", { name: "Ver productos" });

    // La misma URL que emiten el sitemap y el canonical de esa página: sale de
    // `rutaCategoria`, nunca de un template literal armado acá.
    expect(cta).toHaveAttribute("href", "/coleccion/categoria/cuidado-personal");
  });

  it("muestra el gancho «Conocé más!» en cada card", async () => {
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cocina", { id: 1 })]);

    renderSeccion();

    expect(await screen.findByText("Conocé más!")).toBeInTheDocument();
  });

  it("renderiza la foto cargada desde el panel", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Cocina", { id: 1, imagenUrl: "https://cdn.test/cocina.jpg" }),
    ]);

    const { container } = renderSeccion();

    await screen.findByRole("heading", { level: 3, name: "Cocina" });
    const img = container.querySelector("img");

    // Se busca el elemento, NO `getByRole("img")`: la foto es decorativa
    // (`alt=""`), lo que en ARIA le da rol `presentation` y la saca de esa
    // consulta. Con `getByRole("img")` el test de "sin foto" de acá abajo
    // pasaría siempre, mida lo que mida — un guard que no puede fallar.
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://cdn.test/cocina.jpg");
    expect(img).toHaveAttribute("alt", "");
  });

  it("sin foto cargada muestra el placeholder, nunca una imagen rota", async () => {
    categoriasApi.getCategorias.mockResolvedValue([categoria("Sin Foto", { id: 1 })]);

    const { container } = renderSeccion();

    await screen.findByRole("heading", { level: 3, name: "Sin Foto" });
    expect(container.querySelector("img")).toBeNull();
  });

  it("no renderiza nada cuando el panel no marcó ninguna categoría", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Cocina", { id: 1, destacada: false }),
    ]);

    const { container } = renderSeccion();

    await waitFor(() => {
      expect(categoriasApi.getCategorias).toHaveBeenCalled();
    });
    // Una sección con título y cero cards se lee como un error de carga.
    expect(container).toBeEmptyDOMElement();
  });

  it("un fetch fallido oculta la sección en vez de romper la home", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("red caída"));

    const { container } = renderSeccion();

    await waitFor(() => {
      expect(categoriasApi.getCategorias).toHaveBeenCalled();
    });
    expect(container).toBeEmptyDOMElement();
  });
});
