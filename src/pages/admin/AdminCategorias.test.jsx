import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminCategorias from "./AdminCategorias.jsx";
import * as categoriasApi from "../../api/categorias.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/categorias.js");

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminCategorias />
    </MemoryRouter>,
  );
}

describe("AdminCategorias", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista las categorías cargadas", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Iluminación", cantidadProductos: 4 },
    ]);

    renderPagina();

    expect(await screen.findByText("Iluminación")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay categorías", async () => {
    categoriasApi.getCategorias.mockResolvedValue([]);

    renderPagina();

    expect(await screen.findByText("Todavía no hay categorías")).toBeInTheDocument();
  });

  // El selector de ícono se sacó el 06/09/2026 (revert `9e2ce61`: los
  // círculos de la home pasaron a mostrar la foto) y volvió el 13/09/2026,
  // cuando el mockup aprobado del rediseño de la home
  // (`docs/superpowers/specs/2026-09-13-rediseno-home-publica-design.md`,
  // §3 "Círculos de categoría") decidió ícono + color en vez de foto — esa
  // decisión SUPERSEDE al revert de 09/06. Los tres tests que afirmaban su
  // ausencia se reemplazan por estos.
  it("ofrece un selector de ícono con una lista cerrada de Material Symbols", async () => {
    categoriasApi.getCategorias.mockResolvedValue([]);

    renderPagina();
    await screen.findByText("Todavía no hay categorías");

    const selector = screen.getByLabelText(/ícono de la nueva categoría/i);
    expect(within(selector).getAllByRole("option").length).toBeGreaterThan(1);
  });

  it("al crear con un ícono elegido, lo manda a createCategoria", async () => {
    const usuario = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValueOnce([]);
    categoriasApi.createCategoria.mockResolvedValue({ id: 6, nombre: "Deco", cantidadProductos: 0 });
    categoriasApi.getCategorias.mockResolvedValueOnce([
      { id: 6, nombre: "Deco", cantidadProductos: 0, icono: "yard" },
    ]);

    renderPagina();
    await screen.findByText("Todavía no hay categorías");

    await usuario.type(screen.getByPlaceholderText("Nombre de la nueva categoría"), "Deco");
    await usuario.selectOptions(screen.getByLabelText(/ícono de la nueva categoría/i), "yard");
    await usuario.click(screen.getByRole("button", { name: /Agregar/i }));

    expect(categoriasApi.createCategoria).toHaveBeenCalledWith("Deco", "yard");
  });

  it("al crear sin elegir ícono, manda null explícito (no lo omite)", async () => {
    const usuario = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValueOnce([]);
    categoriasApi.createCategoria.mockResolvedValue({ id: 7, nombre: "Aromas", cantidadProductos: 0 });
    categoriasApi.getCategorias.mockResolvedValueOnce([]);

    renderPagina();
    await screen.findByText("Todavía no hay categorías");

    await usuario.type(screen.getByPlaceholderText("Nombre de la nueva categoría"), "Aromas");
    await usuario.click(screen.getByRole("button", { name: /Agregar/i }));

    expect(categoriasApi.createCategoria).toHaveBeenCalledWith("Aromas", null);
  });

  it("al renombrar sin tocar el selector, preserva el ícono vigente", async () => {
    const usuario = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Iluminación", cantidadProductos: 4, icono: "restaurant" },
    ]);
    categoriasApi.updateCategoria.mockResolvedValue({
      id: 1,
      nombre: "Luces",
      cantidadProductos: 4,
      icono: "restaurant",
    });

    renderPagina();
    await screen.findByText("Iluminación");

    await usuario.click(screen.getByRole("button", { name: /Renombrar Iluminación/i }));
    const input = screen.getByDisplayValue("Iluminación");
    await usuario.clear(input);
    await usuario.type(input, "Luces");
    await usuario.click(screen.getByRole("button", { name: /Guardar/i }));

    expect(categoriasApi.updateCategoria).toHaveBeenCalledWith(1, "Luces", "restaurant");
  });

  it("al renombrar, eligiendo otro ícono en el selector, lo manda", async () => {
    const usuario = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Iluminación", cantidadProductos: 4, icono: "restaurant" },
    ]);
    categoriasApi.updateCategoria.mockResolvedValue({
      id: 1,
      nombre: "Iluminación",
      cantidadProductos: 4,
      icono: "spa",
    });

    renderPagina();
    await screen.findByText("Iluminación");

    await usuario.click(screen.getByRole("button", { name: /Renombrar Iluminación/i }));
    await usuario.selectOptions(screen.getByLabelText(/ícono de Iluminación/i), "spa");
    await usuario.click(screen.getByRole("button", { name: /Guardar/i }));

    expect(categoriasApi.updateCategoria).toHaveBeenCalledWith(1, "Iluminación", "spa");
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      {
        id: 1,
        nombre: "Iluminación",
        cantidadProductos: 4,
        cantidadPublicados: 4,
        destacadaEnHome: false,
        imagenUrl: null,
      },
    ]);

    renderPagina();

    await screen.findByText("Iluminación");
    esperarTablaApilada(screen.getByRole("table"));
  });
});

describe("AdminCategorias — fallos de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un error en vez de quedarse cargando para siempre", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    expect(await screen.findByText(/No se pudieron cargar las categorías/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando categorías…")).not.toBeInTheDocument();
  });

  it("si la mutación se aplicó pero la recarga falla, NO muestra el error de la mutación", async () => {
    // `cargarCategorias()` no tenía manejo de error propio: si el refresco
    // fallaba DESPUÉS de un create exitoso, el catch de la mutación mostraba
    // "No se pudo crear la categoría" — pero la categoría SÍ se creó, y el
    // admin iba a reintentar algo que ya pasó (y chocar con el nombre
    // duplicado).
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValueOnce([]); // carga inicial OK
    categoriasApi.createCategoria.mockResolvedValue({ id: 1, nombre: "Deco" });
    categoriasApi.getCategorias.mockRejectedValueOnce(new Error("Failed to fetch")); // refresco caído

    renderPagina();

    await screen.findByText("Todavía no hay categorías");

    await user.type(screen.getByPlaceholderText("Nombre de la nueva categoría"), "Deco");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));

    expect(
      await screen.findByText(/se guardó, pero no se pudo actualizar la lista/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No se pudo crear la categoría/i)).not.toBeInTheDocument();
  });

  it("mantiene el formulario de alta usable tras el fallo", async () => {
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    await screen.findByText(/No se pudieron cargar las categorías/i);
    expect(screen.getByPlaceholderText("Nombre de la nueva categoría")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar/i })).toBeInTheDocument();
  });
});

describe("AdminCategorias — el error de carga y el estado vacío son excluyentes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("con la carga caída NO muestra además 'Todavía no hay categorías'", async () => {
    // Un admin con 10 categorías leería que no tiene ninguna, y puede
    // recrearlas duplicadas: la superficie vacía le afirma algo falso.
    categoriasApi.getCategorias.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    expect(await screen.findByText("No se pudieron cargar las categorías")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay categorías")).not.toBeInTheDocument();
  });

  it("Reintentar vuelve a pedir, y el fetch exitoso limpia el error", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockRejectedValueOnce(new Error("Failed to fetch"));
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 1, nombre: "Hogar", cantidadProductos: 2, cantidadPublicados: 2, destacadaEnHome: false },
    ]);

    renderPagina();

    await screen.findByText("No se pudieron cargar las categorías");
    await user.click(screen.getByRole("button", { name: /Reintentar/i }));

    expect(await screen.findByText("Hogar")).toBeInTheDocument();
    expect(screen.queryByText("No se pudieron cargar las categorías")).not.toBeInTheDocument();
  });

  it("el error de una MUTACIÓN no tapa el estado vacío: la lista sí se pudo leer", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([]);
    categoriasApi.createCategoria.mockRejectedValue(new Error("Ya existe una categoría con ese nombre."));

    renderPagina();

    await screen.findByText("Todavía no hay categorías");

    await user.type(screen.getByPlaceholderText("Nombre de la nueva categoría"), "Hogar");
    await user.click(screen.getByRole("button", { name: /Agregar/i }));

    expect(
      await screen.findByText("Ya existe una categoría con ese nombre."),
    ).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay categorías")).toBeInTheDocument();
  });
});

/**
 * Auditoría de área táctil del 07/09/2026. Los números de cada test salen de
 * una medición en navegador real con `elementFromPoint` (área EFECTIVA, la que
 * recibe el dedo), no de `getBoundingClientRect`: la caja declarada y el área
 * que responde al toque no son lo mismo.
 *
 * jsdom no calcula layout, así que acá se afirma sobre las CLASES declaradas —
 * mismo criterio que `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`.
 * El test no mide: impide que alguien devuelva un tamaño por debajo del mínimo
 * sin enterarse.
 */
describe("AdminCategorias — área táctil (WCAG 2.5.8) y nombres accesibles", () => {
  const CATEGORIA = {
    id: 1,
    nombre: "Iluminación",
    cantidadProductos: 4,
    cantidadPublicados: 4,
    destacadaEnHome: false,
    imagenUrl: "https://cdn.test/ilu.webp",
  };

  beforeEach(() => {
    categoriasApi.getCategorias.mockResolvedValue([CATEGORIA]);
  });

  // El campo de alta sólo tenía `placeholder`, que NO es un nombre accesible:
  // un lector de pantalla anuncia "cuadro de edición" y nada más, y el
  // placeholder desaparece en cuanto se escribe la primera letra.
  it("el campo de nueva categoría tiene nombre accesible, no sólo placeholder", async () => {
    renderPagina();
    await screen.findByText("Iluminación");

    expect(
      screen.getByRole("textbox", { name: "Nombre de la nueva categoría" }),
    ).toBeInTheDocument();
  });

  it("el campo de renombrar tiene nombre accesible", async () => {
    const usuario = userEvent.setup();
    renderPagina();
    await screen.findByText("Iluminación");

    await usuario.click(screen.getByRole("button", { name: "Renombrar Iluminación" }));

    expect(screen.getByRole("textbox", { name: "Nombre de Iluminación" })).toBeInTheDocument();
  });

  // Medido a 390px: 44x25 de área efectiva; a 1280px: 45x25. La pastilla mide
  // 24 de alto por diseño y no puede crecer sin dejar de parecer un switch, así
  // que el área va por pseudo-elemento. Ancho fijo de 44 porque en `md` la
  // pastilla se achica a 36.
  it("el switch de la home extiende su área táctil por pseudo-elemento", async () => {
    renderPagina();
    await screen.findByText("Iluminación");

    const switchHome = screen.getByRole("switch", {
      name: "Que Iluminación aparezca primero en la home",
    });

    expect(switchHome.className).toContain("before:content-['']");
    expect(switchHome.className).toContain("before:h-11");
    expect(switchHome.className).toContain("before:w-11");
  });

  // Medido a 1280px: 33x33 de área efectiva los cuatro (a 390px ya cumplían
  // por el `max-md:size-11` que había). Van agrandados DE VERDAD y no con
  // pseudo-elemento porque "cambiar foto"/"quitar foto" están pegados con
  // `gap-1`: dos áreas de 44 a 36 de paso se superponen y la de más abajo en el
  // DOM le roba la mitad a la de arriba. Con `size-11` el paso pasa a 48.
  it.each([
    "Cambiar la foto de Iluminación",
    "Quitar la foto de Iluminación",
    "Renombrar Iluminación",
    "Eliminar la categoría Iluminación",
  ])("el botón de ícono «%s» mide 44x44 también en escritorio", async (nombre) => {
    renderPagina();
    await screen.findByText("Iluminación");

    const clases = screen.getByRole("button", { name: nombre }).className.split(" ");

    expect(clases).toContain("size-11");
    expect(clases).not.toContain("size-8");
  });

  // Medido a 390px: 93x42. El CTA puede crecer sin costo de diseño, así que
  // lleva el piso real y no un pseudo-elemento.
  it("el CTA Agregar declara el piso táctil de 44 de alto", async () => {
    renderPagina();
    await screen.findByText("Iluminación");

    expect(screen.getByRole("button", { name: /Agregar/i }).className.split(" ")).toContain(
      "min-h-11",
    );
  });

  it("los botones de texto de la celda de acciones extienden su área táctil", async () => {
    const usuario = userEvent.setup();
    renderPagina();
    await screen.findByText("Iluminación");

    await usuario.click(screen.getByRole("button", { name: "Renombrar Iluminación" }));

    for (const nombre of [/Guardar/i, /Cancelar/i]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className).toContain("before:content-['']");
      expect(boton.className).toContain("before:h-11");
      expect(boton.className).toContain("before:w-full");
    }
  });
});
