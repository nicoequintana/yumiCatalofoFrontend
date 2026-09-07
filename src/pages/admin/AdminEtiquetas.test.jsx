import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
