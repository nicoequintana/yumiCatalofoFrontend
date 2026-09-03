import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AdminOrdenes from "./AdminOrdenes.jsx";

vi.mock("../../api/ordenes.js", () => ({
  getOrdenes: vi.fn(),
  getEstadosOrden: vi.fn(),
  actualizarEstadoOrden: vi.fn(),
}));

/**
 * El tablero REAL, mas un "control remoto" del gesto.
 *
 * El arrastre no se puede simular en jsdom (no hay PointerEvent ni
 * setBoundingClientRect util), y desde que la tarjeta ya no tiene `<select>`
 * de estado tampoco queda un control por el que entrar. Sin esto, el camino
 * soltar -> dialogo -> PATCH -> reducer quedaria cubierto SOLO por Playwright.
 *
 * El stub renderiza el tablero de verdad —asi los contadores, las columnas y
 * los estados de carga se siguen afirmando sobre el componente real— y le suma
 * un boton invisible por cada (orden, destino) que llama a `onMovimiento` con
 * exactamente lo que le pasaria un drop. Es la MISMA puerta.
 */
vi.mock("../../components/admin/ordenes/TableroOrdenes.jsx", async (importarOriginal) => {
  const { default: TableroReal } = await importarOriginal();
  return {
    default: (props) => (
      <>
        {Object.entries(props.columnas).flatMap(([origen, columna]) =>
          columna.ordenes.flatMap((orden) =>
            props.estados
              .filter((estado) => estado.valor !== origen)
              .map((estado) => (
                <button
                  key={`${orden.id}-${estado.valor}`}
                  type="button"
                  data-testid={`soltar-${orden.id}-en-${estado.valor}`}
                  onClick={() =>
                    props.onMovimiento({ ordenId: orden.id, origen, destino: estado.valor })
                  }
                />
              )),
          ),
        )}
        <TableroReal {...props} />
      </>
    ),
  };
});

const { getOrdenes, getEstadosOrden, actualizarEstadoOrden } = await import("../../api/ordenes.js");

const ESTADOS = [
  { valor: "PENDIENTE", etiqueta: "Pendiente", terminal: false },
  { valor: "EN_PREPARACION", etiqueta: "En preparación", terminal: false },
  { valor: "ENTREGADA", etiqueta: "Entregada", terminal: true },
  { valor: "CANCELADA", etiqueta: "Cancelada", terminal: true },
];

function orden(id, estado, extra = {}) {
  return {
    id,
    estado,
    estadoEtiqueta: ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado,
    cliente: { nombre: `Cliente ${id}`, dni: "12345678", email: "cliente@ejemplo.com" },
    total: "45000",
    cantidadItems: 2,
    resumen: [{ nombreProducto: "Termo", cantidad: 2 }],
    createdAt: "2026-09-01T12:00:00.000Z",
    ...extra,
  };
}

/** Cada columna responde lo suyo; lo que no se declare responde vacío. */
function responder(porEstado) {
  getOrdenes.mockImplementation(({ estado }) => {
    const respuesta = porEstado[estado];
    if (respuesta instanceof Error) return Promise.reject(respuesta);
    return Promise.resolve(respuesta ?? { data: [], page: 1, pageSize: 15, total: 0 });
  });
}

function renderPantalla(url = "/catalogo/admin/ordenes") {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/catalogo/admin/ordenes" element={<AdminOrdenes />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Espera a que el tablero termine de cargar sus cuatro columnas. */
async function esperarTablero() {
  await screen.findByRole("heading", { name: "Órdenes" });
  await waitFor(() => expect(screen.queryByRole("status", { name: "Cargando" })).not.toBeInTheDocument());
}

beforeEach(() => {
  getEstadosOrden.mockReset();
  getEstadosOrden.mockResolvedValue(ESTADOS);
  getOrdenes.mockReset();
  responder({});
  actualizarEstadoOrden.mockReset();
});

describe("AdminOrdenes — el tablero", () => {
  it("dibuja una columna por estado y pide una vez por cada una", async () => {
    responder({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: 15, total: 3 },
    });
    renderPantalla();
    await esperarTablero();

    expect(getOrdenes).toHaveBeenCalledTimes(4);
    for (const { valor } of ESTADOS) {
      expect(getOrdenes).toHaveBeenCalledWith(expect.objectContaining({ estado: valor, page: 1 }));
    }
    for (const { etiqueta } of ESTADOS) {
      expect(screen.getByRole("region", { name: new RegExp(`^${etiqueta}:`) })).toBeInTheDocument();
    }
  });

  it("el contador de cada columna sale del total del servidor", async () => {
    responder({
      ENTREGADA: { data: [orden(9, "ENTREGADA")], page: 1, pageSize: 15, total: 140 },
    });
    renderPantalla();
    await esperarTablero();

    // 140 aunque solo haya una tarjeta cargada: es el volumen real, no el
    // tamaño de la tanda.
    expect(screen.getByRole("region", { name: "Entregada: 140 órdenes" })).toBeInTheDocument();
  });

  it("una columna que falla NO se lleva puestas a las otras tres", async () => {
    responder({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: 15, total: 1 },
      ENTREGADA: new Error("500 del servidor"),
    });
    renderPantalla();
    await esperarTablero();

    expect(screen.getByText(/No se pudieron cargar estas órdenes/)).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("una columna vacía se distingue de una que falló", async () => {
    renderPantalla();
    await esperarTablero();

    expect(screen.getAllByText("Sin órdenes acá.")).toHaveLength(4);
    expect(screen.queryByText(/No se pudieron cargar/)).not.toBeInTheDocument();
  });

  it("si NO se pueden cargar los estados, muestra el error en vez de un tablero en blanco", async () => {
    // Los estados son las columnas: sin ellos no hay pantalla. En la tabla
    // vieja este fallo se tragaba en silencio porque el filtro por estado era
    // un extra; acá dejaría al admin mirando la nada.
    getEstadosOrden.mockRejectedValue(new Error("401"));
    renderPantalla();

    expect(await screen.findByText("No se pudo cargar el tablero")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Pendiente:/ })).not.toBeInTheDocument();
  });
});

describe("AdminOrdenes — filtro por DNI", () => {
  it("inicializa el chip desde la URL y lo manda en las cuatro consultas", async () => {
    renderPantalla("/catalogo/admin/ordenes?dni=12345678");
    await esperarTablero();

    expect(screen.getByText(/DNI: 12345678/)).toBeInTheDocument();
    for (const llamada of getOrdenes.mock.calls) {
      expect(llamada[0].dni).toBe("12345678");
    }
  });

  it("se puede quitar", async () => {
    renderPantalla("/catalogo/admin/ordenes?dni=12345678");
    await esperarTablero();

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro por DNI" }));

    await waitFor(() => expect(screen.queryByText(/DNI: 12345678/)).not.toBeInTheDocument());
  });
});

describe("AdminOrdenes — cargar más", () => {
  it("pide la página siguiente de ESA columna y agrega sin duplicar", async () => {
    responder({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: 15, total: 2 },
    });
    renderPantalla();
    await esperarTablero();

    getOrdenes.mockResolvedValueOnce({
      data: [orden(1, "PENDIENTE"), orden(2, "PENDIENTE")],
      page: 2,
      pageSize: 15,
      total: 2,
    });
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    await waitFor(() => expect(screen.getByText("#2")).toBeInTheDocument());
    expect(getOrdenes).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: "PENDIENTE", page: 2 }),
    );
    // El id 1 vino en las dos tandas y aparece UNA vez: el catálogo se pudo
    // mover entre pedidos, y dos keys iguales rompen la reconciliación.
    expect(screen.getAllByText("#1")).toHaveLength(1);
  });
});

describe("AdminOrdenes — cambio de estado", () => {
  beforeEach(() => {
    responder({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: 15, total: 1 },
    });
  });

  /** Equivale a soltar la tarjeta #1 sobre la columna `destino`. */
  async function soltarEn(destino) {
    await userEvent.click(screen.getByTestId(`soltar-1-en-${destino}`));
  }

  it("soltar la tarjeta abre el diálogo y NO llama a la API", async () => {
    renderPantalla();
    await esperarTablero();

    await soltarEn("EN_PREPARACION");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(actualizarEstadoOrden).not.toHaveBeenCalled();
  });

  it("confirmar mueve la tarjeta de columna y ajusta LOS DOS contadores", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "EN_PREPARACION",
      estadoEtiqueta: "En preparación",
      items: [{ id: 5, nombreProducto: "Termo", precioUnitario: "22500", cantidad: 2 }],
    });
    renderPantalla();
    await esperarTablero();

    await soltarEn("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "En preparación: 1 orden" })).toBeInTheDocument(),
    );
    expect(screen.getByRole("region", { name: "Pendiente: 0 órdenes" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /En preparación:/ })).getByText("#1"),
    ).toBeInTheDocument();
  });

  it("la respuesta del PATCH NO le borra el monto a la tarjeta", async () => {
    // El PATCH responde con la forma DETALLE: trae `items` pero no `total` ni
    // `resumen`. Pisar la tarjeta con esa respuesta le arrancaría el monto y
    // el hover, sin ningún error.
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "EN_PREPARACION",
      estadoEtiqueta: "En preparación",
      items: [{ id: 5, nombreProducto: "Termo", precioUnitario: "22500", cantidad: 2 }],
    });
    renderPantalla();
    await esperarTablero();

    await soltarEn("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // `getAllByText` y no `getByText`: el panel de resumen se puede haber
    // abierto por el hover que simula userEvent, y ese panel muestra el mismo
    // total. Las dos apariciones son correctas; lo que se afirma es que la
    // tarjeta conserva su monto.
    expect(screen.getAllByText("$ 45.000").length).toBeGreaterThan(0);
    // El guard real: si el reducer hubiera pisado la tarjeta con la respuesta
    // del PATCH, `total` seria undefined y esto seria un guion.
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("muestra las advertencias de stock que devuelve el backend", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "EN_PREPARACION",
      estadoEtiqueta: "En preparación",
      advertencias: ['Stock insuficiente para "Termo": se pidieron 3 unidades y el stock se apoyó en 0.'],
    });
    renderPantalla();
    await esperarTablero();

    await soltarEn("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    expect(await screen.findByTestId("advertencias-stock")).toHaveTextContent(/se pidieron 3 unidades/);
  });

  it("un PATCH que falla cierra el diálogo, avisa y DEJA la tarjeta donde estaba", async () => {
    actualizarEstadoOrden.mockRejectedValue(new Error("No se pudo actualizar."));
    renderPantalla();
    await esperarTablero();

    await soltarEn("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("No se pudo actualizar.")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: /^Pendiente:/ })).getByText("#1"),
    ).toBeInTheDocument();
  });
});

describe("AdminOrdenes — tabs de mobile", () => {
  it("son botones con aria-pressed, no un tablist", async () => {
    // Un tablist de verdad exige roving tabindex, flechas, Home/End y una
    // relación tabpanel. Acá el "panel" es el contenido principal de la
    // pantalla: `aria-pressed` describe lo que realmente pasa.
    renderPantalla();
    await esperarTablero();

    const grupo = within(screen.getByRole("group", { name: "Filtrar por estado" }));
    expect(grupo.getByRole("button", { name: /Pendiente/ })).toHaveAttribute("aria-pressed", "true");
    expect(grupo.getByRole("button", { name: /Entregada/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("elegir un tab lo escribe en la URL", async () => {
    renderPantalla();
    await esperarTablero();

    const grupo = within(screen.getByRole("group", { name: "Filtrar por estado" }));
    await userEvent.click(grupo.getByRole("button", { name: /Entregada/ }));

    await waitFor(() =>
      expect(grupo.getByRole("button", { name: /Entregada/ })).toHaveAttribute("aria-pressed", "true"),
    );
  });
});

describe("AdminOrdenes — la tarjeta no vuelve mientras se confirma", () => {
  it("con el diálogo abierto ya se ve en la columna destino", async () => {
    // Sin esto, al soltar la tarjeta se la ve VOLVER a su columna original
    // detrás del modal: el movimiento real recién ocurre cuando el PATCH
    // responde. La previsualización es puramente derivada de
    // `movimientoPendiente`, así que no hay estado que revertir.
    responder({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: 15, total: 1 },
    });
    renderPantalla();
    await esperarTablero();

    await userEvent.click(screen.getByTestId("soltar-1-en-ENTREGADA"));
    await screen.findByRole("dialog");

    expect(
      within(screen.getByRole("region", { name: /^Entregada:/ })).getByText("#1"),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pendiente: 0 órdenes" })).toBeInTheDocument();
  });

  it("cancelar la devuelve a su columna, sin tocar la API", async () => {
    responder({
      PENDIENTE: { data: [orden(1, "PENDIENTE")], page: 1, pageSize: 15, total: 1 },
    });
    renderPantalla();
    await esperarTablero();

    await userEvent.click(screen.getByTestId("soltar-1-en-ENTREGADA"));
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      within(screen.getByRole("region", { name: /^Pendiente:/ })).getByText("#1"),
    ).toBeInTheDocument();
    expect(actualizarEstadoOrden).not.toHaveBeenCalled();
  });
});
