import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminImportarProductos from "./AdminImportarProductos.jsx";

const descargarPlantillaMock = vi.fn();
const importarProductosMock = vi.fn();

vi.mock("../../api/importProductos.js", () => ({
  descargarPlantilla: (...args) => descargarPlantillaMock(...args),
  importarProductos: (...args) => importarProductosMock(...args),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AdminImportarProductos />
    </MemoryRouter>,
  );
}

function archivoXlsx() {
  return new File(["contenido"], "productos.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminImportarProductos", () => {
  it("muestra el estado inicial con los dos botones", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /descargar plantilla/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^importar$/i })).toBeInTheDocument();
  });

  it("avisa que los productos entran ocultos y sin fotos", () => {
    renderizar();

    expect(screen.getByText(/ocultos/i)).toBeInTheDocument();
    expect(screen.getByText(/fotos/i)).toBeInTheDocument();
  });

  it("deshabilita Importar mientras no haya archivo seleccionado", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /^importar$/i })).toBeDisabled();
  });

  it("descarga la plantilla al hacer click", async () => {
    descargarPlantillaMock.mockResolvedValue(undefined);
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: /descargar plantilla/i }));

    expect(descargarPlantillaMock).toHaveBeenCalled();
  });

  it("muestra la cantidad importada cuando sale bien", async () => {
    importarProductosMock.mockResolvedValue({ cantidad: 12 });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se importaron 12 productos/i)).toBeInTheDocument();
    });
  });

  it("renderiza la tabla de errores con fila, columna y motivo", async () => {
    const error = new Error("El archivo tiene errores. No se importó ningún producto.");
    error.errores = [
      { fila: 12, columna: "precio", valor: "abc", motivo: "El precio debe ser un número mayor a 0." },
      { fila: 23, columna: "categoria", valor: "Bazr", motivo: "La categoría no existe." },
    ];
    importarProductosMock.mockRejectedValue(error);
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no se importó ningún producto/i)).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("precio")).toBeInTheDocument();
    expect(screen.getByText(/el precio debe ser un número mayor a 0/i)).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText(/la categoría no existe/i)).toBeInTheDocument();
  });

  it("muestra un mensaje suelto cuando el error no trae lista de filas", async () => {
    importarProductosMock.mockRejectedValue(new Error("El archivo no tiene ninguna fila para importar."));
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no tiene ninguna fila para importar/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

/**
 * Área táctil (WCAG 2.5.8, mínimo 44×44).
 *
 * ⚠️ **Esta pantalla se le escapó ENTERA al barrido original del 07/09/2026**:
 * no estaba en la lista de rutas que recorría la auditoría. Apareció recién
 * cotejando esa lista contra `App.jsx` — `/catalogo/admin/productos/importar`
 * es una hoja a la que solo se llega desde el listado de productos. La próxima
 * auditoría se arma desde `App.jsx`, no desde las pantallas que uno recuerda.
 *
 * Medido en navegador el 07/09/2026 con `elementFromPoint` (área EFECTIVA, no
 * `getBoundingClientRect`): el botón "Importar" daba **93×42** sobre una caja
 * de 131×41. Lo que falta es el ALTO — el ancho ya sobraba (93 es el tope del
 * sondeo, o sea "≥93").
 *
 * jsdom no hace layout: se afirma sobre la CLASE declarada, igual que en
 * `SelectorCantidad.test.jsx`. La medición real es en navegador.
 */
describe("AdminImportarProductos · área táctil", () => {
  // `min-h-11` y no pseudo-elemento: son dos botones sueltos, cada uno en su
  // propio bloque con `gap-4` (16px) de por medio, así que pueden crecer sin
  // costo de diseño y sin que sus áreas se superpongan. Va ADEMÁS del `py-3`
  // de la variante, nunca en lugar de él: el mínimo táctil es un PISO.
  it.each([
    ["Importar", /^importar$/i],
    // ⚠️ "Descargar plantilla" NO figuraba en la tabla de la auditoría, pero
    // comparte clase por clase la caja del que sí figuraba (`px-5 py-3`,
    // `inline-flex`) y el mismo selector del sondeo: el barrido lo dedupeó.
    // Falla igual, así que se cubre igual.
    ["Descargar plantilla", /descargar plantilla/i],
  ])("el botón %s declara el piso táctil de 44 de alto", (_, nombre) => {
    renderizar();

    const boton = screen.getByRole("button", { name: nombre });
    expect(boton.className.split(" ")).toContain("min-h-11");
    // El tamaño visible de la variante se conserva.
    expect(boton.className.split(" ")).toContain("py-3");
  });

  // Barrido por ROL y no por nombre: el `it.each` de arriba nombra los dos
  // botones que existen hoy y da mejor diagnóstico, pero no ve uno nuevo. Este
  // sí — y esta pantalla ya se perdió una auditoría entera por depender de una
  // lista escrita a mano (07/09/2026).
  it("ningún botón de la pantalla queda por debajo del piso táctil", () => {
    renderizar();

    for (const boton of screen.getAllByRole("button")) {
      expect(boton.className.split(" ")).toContain("min-h-11");
    }
  });

  // Pseudo-elemento: es texto en línea dentro del párrafo del cartel de éxito
  // ("Se importaron N productos como ocultos. Ver productos"), y estirarle la
  // caja le rompería el interlineado al párrafo. `inline-block` le da al
  // pseudo una caja estable contra la cual centrarse — en `display:inline`
  // (el default de un `<a>`) el `w-full` no resuelve de forma confiable.
  //
  // ⚠️ Este enlace tampoco figuraba en la tabla de la auditoría, y por un
  // motivo distinto: solo existe DESPUÉS de una importación exitosa, así que
  // el barrido —que recorre la pantalla recién cargada— no podía verlo.
  it("el link Ver productos del cartel de éxito llega a 44 de alto", async () => {
    importarProductosMock.mockResolvedValue({ cantidad: 12 });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^importar$/i }));

    const enlace = await screen.findByRole("link", { name: /ver productos/i });
    expect(enlace.className).toContain("inline-block");
    // `content-['']` no es decorativo: sin él el pseudo no genera caja y el
    // área táctil sigue siendo la de antes, sin que nada falle.
    expect(enlace.className).toContain("before:content-['']");
    expect(enlace.className).toContain("before:h-11");
    expect(enlace.className).toContain("before:w-full");
  });
});
