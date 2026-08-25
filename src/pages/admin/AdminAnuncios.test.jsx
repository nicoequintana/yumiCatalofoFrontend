import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminAnuncios from "./AdminAnuncios.jsx";
import * as anunciosApi from "../../api/anuncios.js";

vi.mock("../../api/anuncios.js");

const ANUNCIOS = [
  { id: 1, texto: "Envíos a todo el país", activo: true, orden: 0 },
  { id: 2, texto: "Selección elegida a mano", activo: false, orden: 1 },
];

function renderPantalla() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/configuracion/anuncios"]}>
      <AdminAnuncios />
    </MemoryRouter>,
  );
}

/** Espera a que termine la carga inicial y devuelve las filas de la tabla. */
async function filas() {
  await screen.findByText(ANUNCIOS[0].texto);
  const tabla = screen.getByRole("table");
  return within(tabla).getAllByRole("row").slice(1); // sin el encabezado
}

beforeEach(() => {
  vi.clearAllMocks();
  anunciosApi.getAnunciosAdmin.mockResolvedValue(ANUNCIOS);
});

describe("AdminAnuncios", () => {
  // La pantalla usa `getAnunciosAdmin`, NO `getAnuncios`: el panel tiene que ver
  // también los desactivados, que es justo lo que el endpoint público esconde.
  it("pide la lista con la vista de admin, que incluye los inactivos", async () => {
    renderPantalla();

    await waitFor(() => expect(anunciosApi.getAnunciosAdmin).toHaveBeenCalled());
    expect(anunciosApi.getAnuncios).not.toHaveBeenCalled();
    expect(await screen.findByText("Selección elegida a mano")).toBeInTheDocument();
  });

  it("el interruptor refleja el estado de cada anuncio", async () => {
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    const interruptores = screen.getAllByRole("switch");
    expect(interruptores[0]).toHaveAttribute("aria-checked", "true");
    expect(interruptores[1]).toHaveAttribute("aria-checked", "false");
  });

  // Manda `{activo}` solo. Si mandara también el texto, una edición concurrente
  // de otro admin se perdería al apagar el anuncio desde una pantalla vieja.
  it("apagar un anuncio no reenvía su texto", async () => {
    const user = userEvent.setup();
    anunciosApi.updateAnuncio.mockResolvedValue({ ...ANUNCIOS[0], activo: false });
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    await user.click(screen.getAllByRole("switch")[0]);

    expect(anunciosApi.updateAnuncio).toHaveBeenCalledWith(1, { activo: false });
  });

  it("crea un anuncio y recarga la lista", async () => {
    const user = userEvent.setup();
    anunciosApi.createAnuncio.mockResolvedValue({ id: 3, texto: "Nuevo", activo: true, orden: 2 });
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    await user.type(screen.getByLabelText("Texto del nuevo anuncio"), "Nuevo");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(anunciosApi.createAnuncio).toHaveBeenCalledWith("Nuevo");
    await waitFor(() => expect(anunciosApi.getAnunciosAdmin).toHaveBeenCalledTimes(2));
  });

  // El backend reescribe TODOS los `orden` de una: mandar solo el par
  // intercambiado dejaría el resto sin tocar.
  it("mover una fila manda la secuencia completa de ids", async () => {
    const user = userEvent.setup();
    anunciosApi.reordenarAnuncios.mockResolvedValue([ANUNCIOS[1], ANUNCIOS[0]]);
    renderPantalla();
    const [primera] = await filas();

    await user.click(within(primera).getByRole("button", { name: /^Bajar/ }));

    expect(anunciosApi.reordenarAnuncios).toHaveBeenCalledWith([2, 1]);
  });

  it("no se puede subir la primera fila ni bajar la última", async () => {
    renderPantalla();
    const [primera, ultima] = await filas();

    expect(within(primera).getByRole("button", { name: /^Subir/ })).toBeDisabled();
    expect(within(ultima).getByRole("button", { name: /^Bajar/ })).toBeDisabled();
  });

  it("pide confirmación antes de eliminar", async () => {
    const user = userEvent.setup();
    anunciosApi.deleteAnuncio.mockResolvedValue({ ok: true });
    renderPantalla();
    const [primera] = await filas();

    await user.click(within(primera).getByRole("button", { name: /eliminar/i }));
    expect(anunciosApi.deleteAnuncio).not.toHaveBeenCalled();

    await user.click(within(primera).getByRole("button", { name: /^Sí$/ }));
    expect(anunciosApi.deleteAnuncio).toHaveBeenCalledWith(1);
  });

  // Un backend caído tiene que decirlo, no dejar el spinner girando para
  // siempre ni hacerse pasar por "no hay anuncios".
  it("distingue un fallo de carga de una lista vacía", async () => {
    anunciosApi.getAnunciosAdmin.mockRejectedValue(new Error("sin conexión"));
    renderPantalla();

    expect(await screen.findByText(/no se pudieron cargar los anuncios/i)).toBeInTheDocument();
    expect(screen.queryByText(/todavía no hay anuncios/i)).not.toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay ninguno cargado", async () => {
    anunciosApi.getAnunciosAdmin.mockResolvedValue([]);
    renderPantalla();

    expect(await screen.findByText(/todavía no hay anuncios/i)).toBeInTheDocument();
  });

  // Si la recarga posterior falla, la mutación YA se aplicó: decir "no se pudo
  // crear" haría que el admin reintente algo que sí pasó.
  it("si falla la recarga posterior, el mensaje no dice que la operación falló", async () => {
    const user = userEvent.setup();
    anunciosApi.createAnuncio.mockResolvedValue({ id: 3, texto: "Nuevo", activo: true, orden: 2 });
    anunciosApi.getAnunciosAdmin
      .mockResolvedValueOnce(ANUNCIOS)
      .mockRejectedValueOnce(new Error("sin conexión"));
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    await user.type(screen.getByLabelText("Texto del nuevo anuncio"), "Nuevo");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(await screen.findByText(/la operación se guardó/i)).toBeInTheDocument();
  });
});
