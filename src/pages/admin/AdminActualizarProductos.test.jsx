import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AdminActualizarProductos from "./AdminActualizarProductos.jsx";

const exportarProductosMock = vi.fn();
const actualizarProductosMasivoMock = vi.fn();

vi.mock("../../api/importProductos.js", () => ({
  exportarProductos: (...args) => exportarProductosMock(...args),
  actualizarProductosMasivo: (...args) => actualizarProductosMasivoMock(...args),
}));

function renderizar() {
  return render(
    <MemoryRouter>
      <AdminActualizarProductos />
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

describe("AdminActualizarProductos", () => {
  it("muestra el estado inicial con los dos botones", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /exportar catálogo/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^actualizar$/i })).toBeInTheDocument();
  });

  it("nombra las cinco columnas del archivo", () => {
    renderizar();

    expect(screen.getAllByText(/sku/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.getByText(/^costo$/i)).toBeInTheDocument();
    expect(screen.getByText(/^coeficiente$/i)).toBeInTheDocument();
    expect(screen.getByText(/^stock$/i)).toBeInTheDocument();
    // `precio` salió del archivo: se deriva del costo.
    expect(screen.queryByText(/^precio$/i)).not.toBeInTheDocument();
  });

  // El aviso importa más que el resto del copy: es lo único que le dice al
  // admin que subir este archivo NO le vacía la descripción ni el contenido
  // comercial de todo el catálogo, que es lo que haría la versión anterior de
  // `dataDeActualizacion` con una planilla de cuatro columnas.
  it("aclara que solo se tocan nombre, costeo y stock", () => {
    renderizar();

    expect(
      screen.getByText(/solo se modifican nombre, costo, coeficiente y stock/i),
    ).toBeInTheDocument();
  });

  // Sin esta línea, quien sube la planilla se queda esperando que los precios
  // cambien solos. Cambian recién al aplicarlos.
  it("avisa que el precio no se publica con la subida", () => {
    renderizar();

    expect(screen.getByText(/El precio de venta no se sube por acá/i)).toBeInTheDocument();
    expect(screen.getByText(/queda[n]? en «Difiere»/i)).toBeInTheDocument();
  });

  it("manda a la pantalla de importación para dar de alta productos nuevos", () => {
    renderizar();

    expect(screen.getByRole("link", { name: /importar productos/i })).toHaveAttribute(
      "href",
      "/catalogo/admin/productos/importar",
    );
  });

  it("deshabilita Actualizar mientras no haya archivo seleccionado", () => {
    renderizar();

    expect(screen.getByRole("button", { name: /^actualizar$/i })).toBeDisabled();
  });

  it("exporta el catálogo al hacer click", async () => {
    exportarProductosMock.mockResolvedValue(undefined);
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: /exportar catálogo/i }));

    expect(exportarProductosMock).toHaveBeenCalled();
  });

  it("muestra la cantidad actualizada", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ actualizados: 7, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se actualizaron 7 productos/i)).toBeInTheDocument();
    });
    // Este flujo dejó de crear productos el 25/08/2026.
    expect(screen.queryByText(/se crearon/i)).not.toBeInTheDocument();
  });

  it("usa el singular cuando actualizó un solo producto", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ actualizados: 1, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/se actualizó 1 producto\./i)).toBeInTheDocument();
    });
  });

  it("renderiza la tabla de errores con fila, columna y motivo", async () => {
    const error = new Error("El archivo tiene errores. No se guardó ningún producto.");
    error.errores = [
      { fila: 12, columna: "sku", valor: "NOEXISTE", motivo: "No existe ningún producto con este SKU." },
      { fila: 23, columna: "precio", valor: "abc", motivo: "El precio debe ser un número mayor a 0." },
    ];
    actualizarProductosMasivoMock.mockRejectedValue(error);
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no se guardó ningún producto/i)).toBeInTheDocument();
    });
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("sku")).toBeInTheDocument();
    expect(screen.getByText(/no existe ningún producto con este sku/i)).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
  });

  it("muestra un mensaje suelto cuando el error no trae lista de filas", async () => {
    actualizarProductosMasivoMock.mockRejectedValue(
      new Error("El archivo no tiene ninguna fila para actualizar o crear."),
    );
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    await waitFor(() => {
      expect(screen.getByText(/no tiene ninguna fila para actualizar/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

/**
 * Área táctil (WCAG 2.5.8, mínimo 44×44).
 *
 * ⚠️ **Esta pantalla se le escapó ENTERA al barrido original del 07/09/2026**:
 * no estaba en la lista de rutas que recorría la auditoría. Apareció recién
 * cotejando esa lista contra `App.jsx` —
 * `/catalogo/admin/productos/actualizar-masivo` es una hoja a la que solo se
 * llega desde el listado de productos. La próxima auditoría se arma desde
 * `App.jsx`, no desde las pantallas que uno recuerda.
 *
 * Medido en navegador el 07/09/2026 con `elementFromPoint` (área EFECTIVA, no
 * `getBoundingClientRect`):
 *
 * - link "Importar productos" (dentro de un `<li>`): **93×22** (caja 149×21)
 * - botón "Actualizar": **93×42** (caja 147×41)
 *
 * En los dos falta el ALTO: el 93 es el tope del sondeo (46px por lado + 1),
 * o sea "≥93", y el ancho ya sobraba.
 *
 * jsdom no hace layout: se afirma sobre la CLASE declarada, igual que en
 * `SelectorCantidad.test.jsx`. La medición real es en navegador.
 */
describe("AdminActualizarProductos · área táctil", () => {
  // `min-h-11` y no pseudo-elemento: son dos botones sueltos, cada uno en su
  // propio bloque con `gap-4` (16px) de por medio, así que pueden crecer sin
  // costo de diseño y sin que sus áreas se superpongan. Va ADEMÁS del `py-3`
  // de la variante, nunca en lugar de él: el mínimo táctil es un PISO.
  it.each([
    ["Actualizar", /^actualizar$/i],
    // ⚠️ "Exportar catálogo" NO figuraba en la tabla de la auditoría, pero
    // comparte clase por clase la caja del que sí figuraba (`px-5 py-3`,
    // `inline-flex`) y el mismo selector del sondeo: el barrido lo dedupeó.
    // Falla igual, así que se cubre igual.
    ["Exportar catálogo", /exportar catálogo/i],
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

  // Pseudo-elemento y no `min-h-11`: el enlace es texto en línea dentro de un
  // `<li>` de la lista de instrucciones ("Para cargar productos nuevos usá
  // Importar productos, que pide todos los campos"). Estirarle la caja movería
  // el interlineado del ítem entero. `inline-block` le da al pseudo una caja
  // estable contra la cual centrarse — en `display:inline` (el default de un
  // `<a>`) el `w-full` no resuelve de forma confiable. El `<li>` no tiene
  // ningún otro control, así que el pseudo puede sobresalir del renglón sin
  // robarle área a nadie.
  it("el link Importar productos llega a 44 de alto por pseudo-elemento", () => {
    renderizar();

    const enlace = screen.getByRole("link", { name: /importar productos/i });
    expect(enlace.className).toContain("inline-block");
    // `content-['']` no es decorativo: sin él el pseudo no genera caja y el
    // área táctil sigue siendo la de antes, sin que nada falle.
    expect(enlace.className).toContain("before:content-['']");
    expect(enlace.className).toContain("before:h-11");
    // El ancho ya sobra (149 de caja): copia el propio en vez de fijar 44.
    expect(enlace.className).toContain("before:w-full");
  });

  // ⚠️ Este enlace tampoco figuraba en la tabla de la auditoría, y por un
  // motivo distinto: solo existe DESPUÉS de una actualización exitosa, así que
  // el barrido —que recorre la pantalla recién cargada— no podía verlo.
  it("el link Ver productos del cartel de éxito llega a 44 de alto", async () => {
    actualizarProductosMasivoMock.mockResolvedValue({ actualizados: 7, productos: [] });
    renderizar();

    await userEvent.upload(screen.getByLabelText(/archivo/i), archivoXlsx());
    await userEvent.click(screen.getByRole("button", { name: /^actualizar$/i }));

    const enlace = await screen.findByRole("link", { name: /ver productos/i });
    expect(enlace.className).toContain("inline-block");
    expect(enlace.className).toContain("before:content-['']");
    expect(enlace.className).toContain("before:h-11");
    expect(enlace.className).toContain("before:w-full");
  });
});

