import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminCategorias from "./AdminCategorias.jsx";
import * as categoriasApi from "../../api/categorias.js";

vi.mock("../../api/categorias.js");

/**
 * Lo que el panel controla de la sección "Explorá por categoría" de la home:
 * qué categorías se muestran y con qué foto.
 *
 * Vive aparte de `AdminCategorias.test.jsx`, que cubre el CRUD de nombres.
 */
function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminCategorias />
    </MemoryRouter>,
  );
}

function categoria(
  nombre,
  { id, destacada = false, orden = 0, imagenUrl = null, publicados = 3 } = {},
) {
  return {
    id,
    nombre,
    cantidadProductos: 3,
    cantidadPublicados: publicados,
    destacadaEnHome: destacada,
    ordenHome: orden,
    imagenUrl,
  };
}

describe("AdminCategorias — selección para la home", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca una categoría para la home", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cocina", { id: 1 })]);
    categoriasApi.destacarCategoriaEnHome.mockResolvedValue({});

    renderPagina();
    await screen.findByText("Cocina");

    await user.click(screen.getByRole("switch"));

    expect(categoriasApi.destacarCategoriaEnHome).toHaveBeenCalledWith(1, true);
  });

  it("desmarca una categoría ya destacada", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Cocina", { id: 1, destacada: true }),
    ]);
    categoriasApi.destacarCategoriaEnHome.mockResolvedValue({});

    renderPagina();
    await screen.findByText("Cocina");

    await user.click(screen.getByRole("switch"));

    expect(categoriasApi.destacarCategoriaEnHome).toHaveBeenCalledWith(1, false);
  });

  it("muestra el mensaje del BACKEND cuando se pasa del tope", async () => {
    // El texto del tope lo escribe el servidor, que es donde la regla se
    // aplica. Reemplazarlo por uno genérico acá dejaría al admin sin saber por
    // qué no pudo marcar la cuarta.
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cuarta", { id: 4 })]);
    categoriasApi.destacarCategoriaEnHome.mockRejectedValue(
      new Error("La home muestra 3 categorías. Sacá una antes de agregar otra."),
    );

    renderPagina();
    await screen.findByText("Cuarta");

    await user.click(screen.getByRole("switch"));

    expect(
      await screen.findByText("La home muestra 3 categorías. Sacá una antes de agregar otra."),
    ).toBeInTheDocument();
  });

  it("avisa cuando una destacada no tiene productos publicados", async () => {
    // Para esto existe `cantidadPublicados` aparte de `cantidadProductos`: la
    // card se vería perfecta en la home y su "Ver productos" caería en una
    // grilla vacía. No se bloquea —la selección es del admin— pero no puede
    // pasar en silencio.
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Vacía", { id: 1, destacada: true, publicados: 0 }),
    ]);

    renderPagina();

    expect(await screen.findByText(/lleva a una grilla vacía/i)).toBeInTheDocument();
  });

  it("no avisa si la destacada sí tiene productos publicados", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Llena", { id: 1, destacada: true, publicados: 4 }),
    ]);

    renderPagina();

    await screen.findByText("Llena");
    expect(screen.queryByText(/lleva a una grilla vacía/i)).not.toBeInTheDocument();
  });

  it("no avisa sobre una categoría vacía que NO está destacada", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Vacía", { id: 1, destacada: false, publicados: 0 }),
    ]);

    renderPagina();

    await screen.findByText("Vacía");
    expect(screen.queryByText(/lleva a una grilla vacía/i)).not.toBeInTheDocument();
  });

  it("el control es un SWITCH, no un checkbox", async () => {
    // Decisión de producto (29/08/2026): el panel usa el mismo interruptor que
    // los toggles de `AdminProductos` — `role="switch"` sobre un `<button>`.
    // Un `<input type="checkbox">` rompe esa estética y se anuncia distinto.
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cocina", { id: 1 })]);

    renderPagina();
    await screen.findByText("Cocina");

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("no ofrece controles de orden: la home usa el orden en que se marcaron", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Alfa", { id: 1, destacada: true, orden: 0 }),
      categoria("Beta", { id: 2, destacada: true, orden: 1 }),
    ]);

    renderPagina();
    await screen.findByText("Alfa");

    expect(screen.queryByLabelText(/Subir "Alfa"/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Bajar "Alfa"/)).not.toBeInTheDocument();
  });

  it("avisa que la sección no se muestra si no hay ninguna marcada", async () => {
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cocina", { id: 1 })]);

    renderPagina();

    expect(await screen.findByText(/esa sección no se muestra/i)).toBeInTheDocument();
  });
});

describe("AdminCategorias — foto de la categoría", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sube el archivo elegido", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cocina", { id: 1 })]);
    categoriasApi.subirImagenCategoria.mockResolvedValue({});

    const { container } = renderPagina();
    await screen.findByText("Cocina");

    const archivo = new File(["bytes"], "cocina.jpg", { type: "image/jpeg" });
    await user.upload(container.querySelector('input[type="file"]'), archivo);

    expect(categoriasApi.subirImagenCategoria).toHaveBeenCalledWith(1, archivo);
  });

  it("sin foto ofrece subir; con foto ofrece cambiar y quitar", async () => {
    // Los botones son SÓLO ícono, así que lo único que los identifica —para un
    // lector de pantalla y para estos tests— es su nombre accesible. Este test
    // es lo que frena que alguien saque el `aria-label` al tocar el estilo y
    // deje cuatro botones anónimos en la fila.
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Cocina", { id: 1 }),
      categoria("Hogar", { id: 2, imagenUrl: "https://cdn.test/hogar.jpg" }),
    ]);

    renderPagina();
    await screen.findByText("Cocina");

    expect(screen.getByRole("button", { name: /Subir la foto de Cocina/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cambiar la foto de Hogar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Quitar la foto de Hogar/i })).toBeInTheDocument();

    // Cocina no tiene foto: no hay nada que quitar.
    expect(screen.queryByRole("button", { name: /Quitar la foto de Cocina/i })).not.toBeInTheDocument();
  });

  it("cada acción de la fila conserva un nombre accesible", async () => {
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Cocina", { id: 1, imagenUrl: "https://cdn.test/cocina.jpg" }),
    ]);

    renderPagina();
    await screen.findByText("Cocina");

    for (const nombre of [
      /Cambiar la foto de Cocina/i,
      /Quitar la foto de Cocina/i,
      /Renombrar Cocina/i,
      /Eliminar la categoría Cocina/i,
    ]) {
      expect(screen.getByRole("button", { name: nombre })).toBeInTheDocument();
    }
  });

  it("quita la foto", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([
      categoria("Hogar", { id: 2, imagenUrl: "https://cdn.test/hogar.jpg" }),
    ]);
    categoriasApi.quitarImagenCategoria.mockResolvedValue({});

    renderPagina();
    await screen.findByText("Hogar");

    await user.click(screen.getByRole("button", { name: /Quitar la foto de Hogar/i }));

    expect(categoriasApi.quitarImagenCategoria).toHaveBeenCalledWith(2);
  });

  it("un fallo de subida muestra el mensaje y no deja la fila trabada", async () => {
    const user = userEvent.setup();
    categoriasApi.getCategorias.mockResolvedValue([categoria("Cocina", { id: 1 })]);
    categoriasApi.subirImagenCategoria.mockRejectedValue(new Error("Formato no permitido."));

    const { container } = renderPagina();
    await screen.findByText("Cocina");

    await user.upload(
      container.querySelector('input[type="file"]'),
      new File(["x"], "x.jpg", { type: "image/jpeg" }),
    );

    expect(await screen.findByText("Formato no permitido.")).toBeInTheDocument();
    await waitFor(() => {
      expect(container.querySelector('input[type="file"]')).toBeEnabled();
    });
  });
});
