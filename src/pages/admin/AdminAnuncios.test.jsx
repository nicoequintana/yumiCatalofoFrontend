import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminAnuncios from "./AdminAnuncios.jsx";
import * as anunciosApi from "../../api/anuncios.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

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

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    renderPantalla();

    await screen.findByText(ANUNCIOS[0].texto);
    esperarTablaApilada(screen.getByRole("table"));
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

/**
 * Auditoría de área táctil del 07/09/2026. Los números salen de una medición en
 * navegador real con `elementFromPoint` (área EFECTIVA, la que recibe el dedo),
 * no de `getBoundingClientRect`.
 *
 * jsdom no calcula layout: acá se afirma sobre las CLASES declaradas, mismo
 * criterio que `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`.
 */
describe("AdminAnuncios — área táctil (WCAG 2.5.8)", () => {
  // Medido a 390px: 44x25; a 1280px: 45x25. La pastilla mide 24 de alto por
  // diseño; el área va por pseudo-elemento y con `before:w-full` porque el
  // switch ya mide 44 de ancho en todos los breakpoints.
  it("el switch de activo extiende su área táctil por pseudo-elemento", async () => {
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    for (const interruptor of screen.getAllByRole("switch")) {
      expect(interruptor.className).toContain("before:content-['']");
      expect(interruptor.className).toContain("before:h-11");
      expect(interruptor.className).toContain("before:w-full");
    }
  });

  // Medido a 1280px: 32x33 de área efectiva (a 390px ya cumplían por el
  // `max-md:size-11`). Van agrandados DE VERDAD: están pegados con `gap-1`, y
  // dos pseudo-elementos de 44 a 36 de paso se superponen — el de más abajo en
  // el DOM le roba la mitad del área al de arriba. Con `size-11` el paso es 48.
  it.each([/^Subir /, /^Bajar /])(
    "los botones de reordenar (%s) miden 44x44 también en escritorio",
    async (nombre) => {
      renderPantalla();
      await screen.findByText(ANUNCIOS[0].texto);

      for (const boton of screen.getAllByRole("button", { name: nombre })) {
        const clases = boton.className.split(" ");
        expect(clases).toContain("size-11");
        expect(clases).not.toContain("size-8");
      }
    },
  );

  // Medido a 1280px: 80x19 el de editar y 93x19 el de eliminar. Son texto en
  // línea dentro de una celda densa: agrandar la caja partiría la fila de
  // acciones, así que el área va por pseudo-elemento con el ancho propio
  // (`before:w-full`), que no invade al botón de al lado.
  it("los botones de acción en línea extienden su área táctil", async () => {
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    // El nombre accesible arrastra la ligadura del ícono ("editEditar"), así
    // que se ancla el final y no el principio.
    for (const nombre of [/Editar$/, /Eliminar$/]) {
      for (const boton of screen.getAllByRole("button", { name: nombre })) {
        expect(boton.className).toContain("before:content-['']");
        expect(boton.className).toContain("before:h-11");
        expect(boton.className).toContain("before:w-full");
      }
    }
  });

  // Medido a 390px: 93x41. El CTA puede crecer sin costo de diseño, así que
  // lleva el piso real y no un pseudo-elemento.
  it("el CTA Agregar declara el piso táctil de 44 de alto", async () => {
    renderPantalla();
    await screen.findByText(ANUNCIOS[0].texto);

    expect(screen.getByRole("button", { name: /agregar/i }).className.split(" ")).toContain(
      "min-h-11",
    );
  });
});
