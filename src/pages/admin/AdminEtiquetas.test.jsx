import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/etiquetas.js", () => ({
  getEtiquetasAdmin: vi.fn(),
  getOpcionesColor: vi.fn(),
  createEtiqueta: vi.fn(),
  updateEtiqueta: vi.fn(),
  deleteEtiqueta: vi.fn(),
}));

const api = await import("../../api/etiquetas.js");
const { default: AdminEtiquetas } = await import("./AdminEtiquetas.jsx");

const FILAS = [
  {
    id: 1,
    nombre: "Nuevo",
    color: "VERDE",
    colorFondo: "46 125 50",
    colorTexto: "255 255 255",
    cantidadProductos: 3,
  },
  {
    id: 2,
    nombre: "Exclusivo",
    color: null,
    colorFondo: null,
    colorTexto: null,
    cantidadProductos: 0,
  },
];

const COLORES = [
  { id: "TERRACOTA", nombre: "Terracota", fondo: "157 62 29", texto: "255 255 255" },
  { id: "VERDE", nombre: "Verde", fondo: "46 125 50", texto: "255 255 255" },
];

function montar() {
  return render(
    <MemoryRouter>
      <AdminEtiquetas />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getEtiquetasAdmin.mockResolvedValue(FILAS);
  api.getOpcionesColor.mockResolvedValue({ colores: COLORES });
});

// La paleta reemplazó a un `<select>` que NUNCA tuvo test: el control central
// de la pantalla estaba sin cubrir, y por eso cambiarlo entero no puso nada en
// rojo. Estos casos existen para que eso no se repita.
describe("AdminEtiquetas — paleta de colores", () => {
  /** Los swatches de una fila, por el `aria-label` del grupo que los contiene. */
  function paletaDe(nombre) {
    return screen.getByRole("group", { name: `Color de ${nombre}` });
  }

  it("ofrece un swatch por color más el de por defecto", async () => {
    montar();
    await screen.findByText("Nuevo");

    const botones = within(paletaDe("Nuevo")).getAllByRole("button");
    expect(botones).toHaveLength(COLORES.length + 1);
    expect(within(paletaDe("Nuevo")).getByRole("button", { name: /por defecto/i })).toBeVisible();
  });

  it("marca como presionado SOLO el color de esa etiqueta", async () => {
    montar();
    await screen.findByText("Nuevo");

    // "Nuevo" está en VERDE.
    expect(within(paletaDe("Nuevo")).getByRole("button", { name: "Verde" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(paletaDe("Nuevo")).getByRole("button", { name: "Terracota" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    // "Exclusivo" no tiene color: el presionado es "Por defecto".
    expect(
      within(paletaDe("Exclusivo")).getByRole("button", { name: /por defecto/i }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("avisa qué color ya usa OTRA etiqueta, nombrándola", async () => {
    montar();
    await screen.findByText("Nuevo");

    // Desde la fila de "Exclusivo", el verde está tomado por "Nuevo".
    expect(
      within(paletaDe("Exclusivo")).getByRole("button", { name: /verde — en uso por Nuevo/i }),
    ).toBeVisible();
  });

  it("NO marca como en uso el color propio de la fila", async () => {
    montar();
    await screen.findByText("Nuevo");

    // En su propia fila, el verde es "seleccionado", no "en uso por otra".
    const propio = within(paletaDe("Nuevo")).getByRole("button", { name: "Verde" });
    expect(propio).toBeVisible();
    expect(
      within(paletaDe("Nuevo")).queryByRole("button", { name: /en uso por Nuevo/i }),
    ).not.toBeInTheDocument();
  });

  it("al elegir un color lo guarda con el id de la paleta", async () => {
    api.updateEtiqueta.mockResolvedValue({ id: 2 });
    montar();
    await screen.findByText("Exclusivo");

    await userEvent.click(
      within(paletaDe("Exclusivo")).getByRole("button", { name: "Terracota" }),
    );

    await waitFor(() => expect(api.updateEtiqueta).toHaveBeenCalledWith(2, { color: "TERRACOTA" }));
  });

  it("al elegir «Por defecto» manda null explícito, no cadena vacía", async () => {
    api.updateEtiqueta.mockResolvedValue({ id: 1 });
    montar();
    await screen.findByText("Nuevo");

    await userEvent.click(within(paletaDe("Nuevo")).getByRole("button", { name: /por defecto/i }));

    await waitFor(() => expect(api.updateEtiqueta).toHaveBeenCalledWith(1, { color: null }));
  });
});

describe("AdminEtiquetas", () => {
  it("lista las etiquetas con su conteo de productos", async () => {
    montar();
    expect(await screen.findByText("Nuevo")).toBeInTheDocument();
    expect(screen.getByText("Exclusivo")).toBeInTheDocument();
  });

  it("pinta el chip con el color que manda el backend", async () => {
    // Adaptado por ruling: `Badge` no emite `data-testid`, así que se
    // consulta por el TEXTO de la etiqueta (el propio `<span>` del chip) en
    // vez de por un testid que habría que agregarle a un componente ya
    // migrado.
    montar();
    const chip = await screen.findByText("Nuevo");
    expect(chip).toHaveStyle({ backgroundColor: "rgb(46, 125, 50)" });
  });

  it("una etiqueta sin color cae al token por defecto, sin style", async () => {
    montar();
    const chip = await screen.findByText("Exclusivo");
    expect(chip.getAttribute("style")).toBeFalsy();
    expect(chip.className).toContain("bg-tertiary");
  });

  it("crea una etiqueta", async () => {
    api.createEtiqueta.mockResolvedValue({ id: 3 });
    montar();
    await screen.findByText("Nuevo");

    await userEvent.type(screen.getByLabelText(/nombre de la nueva etiqueta/i), "Oferta");
    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => expect(api.createEtiqueta).toHaveBeenCalledWith("Oferta", null));
  });

  // Bug de la review final: el backend acepta `nombre` en el PUT, pero el
  // panel solo tenía el selector de color. Con el borrado bloqueado mientras
  // haya productos usándola, una etiqueta mal escrita con productos no se
  // podía corregir NI borrar. Molde: `AdminAnuncios.jsx`, que ya tiene edición
  // inline de texto.
  it("permite renombrar una etiqueta desde el panel", async () => {
    api.updateEtiqueta.mockResolvedValue({ id: 1 });
    montar();
    await screen.findByText("Nuevo");

    await userEvent.click(screen.getByRole("button", { name: /editar nuevo/i }));

    const input = screen.getByLabelText(/nombre de la etiqueta/i);
    expect(input).toHaveValue("Nuevo");

    await userEvent.clear(input);
    await userEvent.type(input, "Novedad");
    await userEvent.click(screen.getByRole("button", { name: /guardar/i }));

    await waitFor(() =>
      expect(api.updateEtiqueta).toHaveBeenCalledWith(1, { nombre: "Novedad" }),
    );
  });

  it("cancelar la edición no guarda nada", async () => {
    montar();
    await screen.findByText("Nuevo");

    await userEvent.click(screen.getByRole("button", { name: /editar nuevo/i }));
    const input = screen.getByLabelText(/nombre de la etiqueta/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Lo que sea");
    await userEvent.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(api.updateEtiqueta).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/nombre de la etiqueta/i)).not.toBeInTheDocument();
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("el input de edición lleva el mismo tope y muestra el contador", async () => {
    montar();
    await screen.findByText("Nuevo");

    await userEvent.click(screen.getByRole("button", { name: /editar nuevo/i }));
    const input = screen.getByLabelText(/nombre de la etiqueta/i);

    expect(input).toHaveAttribute("maxLength", "40");
    expect(screen.getByText("5/40")).toBeInTheDocument();
  });

  it("no ofrece borrar una etiqueta en uso y explica por qué", async () => {
    montar();
    await screen.findByText("Nuevo");

    const boton = screen.getByRole("button", { name: /eliminar nuevo/i });
    expect(boton).toBeDisabled();
    expect(boton).toHaveAccessibleDescription(/3 productos/i);
  });

  it("muestra el error del backend cuando el alta falla", async () => {
    api.createEtiqueta.mockRejectedValue(new Error('Ya existe una etiqueta llamada "Nuevo".'));
    montar();
    await screen.findByText("Nuevo");

    await userEvent.type(screen.getByLabelText(/nombre de la nueva etiqueta/i), "Nuevo");
    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));

    expect(await screen.findByText(/ya existe una etiqueta/i)).toBeInTheDocument();
  });

  it("no afirma que no hay etiquetas cuando la carga falló", async () => {
    api.getEtiquetasAdmin.mockRejectedValue(new Error("boom"));
    montar();

    expect(await screen.findByText(/no se pudieron cargar/i)).toBeInTheDocument();
    expect(screen.queryByText(/todavía no hay etiquetas/i)).not.toBeInTheDocument();
  });

  it("cumple el contrato de la tabla apilada", async () => {
    // Adaptado: `esperarTablaApilada` recibe la tabla como argumento en TODOS
    // los demás specs del repo (ver AdminAnuncios.test.jsx, por ejemplo) — el
    // brief la invocaba sin argumento, lo que la haría fallar por el motivo
    // equivocado (tabla `undefined`), no por el contrato real.
    montar();
    await screen.findByText("Nuevo");
    esperarTablaApilada(screen.getByRole("table"));
  });
});

/**
 * Auditoría de área táctil del 07/09/2026, medida en navegador real con
 * `elementFromPoint` (área EFECTIVA, no la caja declarada) a 390×844 y a
 * 1280×800. Tres controles de esta pantalla quedaban por debajo de 44×44:
 *
 * - las 126 muestras de la paleta (21 por fila × 6 filas): 33×33 a 1280;
 * - el botón "Editar <etiqueta>" (×12): 37×37 a 1280;
 * - el CTA "Agregar" del alta: 93×42 en los dos anchos.
 *
 * jsdom no calcula layout, así que acá se afirma sobre las CLASES declaradas
 * —mismo criterio que `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`—.
 * La medición real es en navegador; el test protege que nadie devuelva el
 * tamaño por debajo del mínimo sin darse cuenta.
 */
describe("AdminEtiquetas — área táctil", () => {
  it("cada muestra de la paleta mide 44×44 en TODOS los anchos", async () => {
    montar();
    await screen.findByText("Nuevo");

    const paleta = screen.getByRole("group", { name: "Color de Nuevo" });
    for (const boton of within(paleta).getAllByRole("button")) {
      const clases = boton.className.split(" ");
      expect(clases, boton.title).toContain("h-11");
      expect(clases, boton.title).toContain("w-11");
      // El 32px de escritorio se fue: la muestra ya no cambia de tamaño por
      // breakpoint, así que tampoco quedan las clases que lo hacían.
      expect(clases, boton.title).not.toContain("h-8");
      expect(clases, boton.title).not.toContain("w-8");
      expect(clases, boton.title).not.toContain("max-md:h-11");
      expect(clases, boton.title).not.toContain("max-md:w-11");
    }
  });

  it("los botones de ícono extienden el área a 44×44 sin crecer de tamaño visible", async () => {
    montar();
    await screen.findByText("Nuevo");

    const editar = screen.getByRole("button", { name: /editar nuevo/i });
    // El pseudo-elemento necesita un ancestro posicionado y un `content`, o no
    // se pinta ninguna caja y el área táctil sigue siendo la de siempre.
    expect(editar.className).toContain("relative");
    expect(editar.className).toContain("before:content-['']");
    expect(editar.className).toContain("before:h-11");
    expect(editar.className).toContain("before:w-11");
    // El disco visible sigue siendo el de 36px en escritorio.
    expect(editar.className.split(" ")).toContain("h-9");
  });

  it("el CTA «Agregar» declara el piso táctil de 44 de alto", async () => {
    montar();
    await screen.findByText("Nuevo");

    expect(
      screen.getByRole("button", { name: /agregar/i }).className.split(" "),
    ).toContain("min-h-11");
  });
});
