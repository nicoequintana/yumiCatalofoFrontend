import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import AdminOrdenes from "./AdminOrdenes.jsx";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/ordenes.js", () => ({
  getOrdenes: vi.fn(),
  getConteoOrdenesPorEstado: vi.fn(),
  getEstadosOrden: vi.fn(),
  actualizarEstadoOrden: vi.fn(),
}));

const { getOrdenes, getConteoOrdenesPorEstado, getEstadosOrden, actualizarEstadoOrden } = await import(
  "../../api/ordenes.js"
);

const ESTADOS = [
  { valor: "PENDIENTE", etiqueta: "Pendiente", terminal: false },
  { valor: "EN_PREPARACION", etiqueta: "En preparación", terminal: false },
  { valor: "ENTREGADA", etiqueta: "Entregada", terminal: true },
  { valor: "CANCELADA", etiqueta: "Cancelada", terminal: true },
];

const RESUMEN = { PENDIENTE: 12, EN_PREPARACION: 4, ENTREGADA: 289, CANCELADA: 7 };

function orden(id, estado = "PENDIENTE", extra = {}) {
  return {
    id,
    estado,
    estadoEtiqueta: ESTADOS.find((e) => e.valor === estado)?.etiqueta ?? estado,
    cliente: { id, dni: "12345678", nombre: `Cliente ${id}`, telefono: "1122", email: "c@ej.com" },
    total: "45000",
    cantidadItems: 2,
    resumen: [{ nombreProducto: "Termo", cantidad: 2 }],
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    notas: null,
    ...extra,
  };
}

/** Respuesta del listado con los defaults del sobre paginado. */
function pagina(ordenes, extra = {}) {
  return { data: ordenes, page: 1, pageSize: 20, total: ordenes.length, ...extra };
}

let ubicacion = null;

function EspiaUbicacion() {
  ubicacion = useLocation();
  return null;
}

function renderPantalla(url = "/catalogo/admin/ordenes") {
  ubicacion = null;
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/catalogo/admin/ordenes"
          element={
            <>
              <AdminOrdenes />
              <EspiaUbicacion />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

/** Los parámetros de la URL vigente, ya parseados. */
function params() {
  return new URLSearchParams(ubicacion?.search ?? "");
}

/**
 * El badge de estado de una fila.
 *
 * Se busca por la celda y no por texto: el `<select>` de Acciones tiene una
 * `<option>` con la MISMA etiqueta, así que un `getByText("Entregada")`
 * encuentra dos nodos y no distingue el badge (lo que la fila AFIRMA) de la
 * opción (lo que se puede elegir).
 */
function badgeDeFila(fila) {
  return fila.querySelector('[data-celda="control"]');
}

/** Espera a que la grilla termine su primera carga. */
async function esperarGrilla() {
  await screen.findByRole("heading", { name: "Órdenes" });
  await waitFor(() =>
    expect(screen.queryByRole("status", { name: "Cargando" })).not.toBeInTheDocument(),
  );
}

beforeEach(() => {
  getEstadosOrden.mockReset();
  getEstadosOrden.mockResolvedValue(ESTADOS);
  getConteoOrdenesPorEstado.mockReset();
  getConteoOrdenesPorEstado.mockResolvedValue(RESUMEN);
  getOrdenes.mockReset();
  getOrdenes.mockResolvedValue(pagina([]));
  actualizarEstadoOrden.mockReset();
});

describe("AdminOrdenes — la grilla", () => {
  it("cumple el contrato de tabla apilada del admin", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1), orden(2, "ENTREGADA")]));
    renderPantalla();
    await esperarGrilla();

    esperarTablaApilada(screen.getByRole("table"));
  });

  it("dibuja las ocho columnas de la maqueta, en orden", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const encabezados = screen
      .getAllByRole("columnheader")
      .map((th) => (th.getAttribute("data-titulo") ?? th.textContent).trim());
    expect(encabezados).toEqual([
      "Nº",
      "Cliente",
      "DNI",
      "Items",
      "Total",
      "Estado",
      "Fecha",
      "Acciones",
    ]);
  });

  it("muestra el id, el cliente, el DNI, el total y el estado de cada orden", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(7, "ENTREGADA")]));
    renderPantalla();
    await esperarGrilla();

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).getByText("#7")).toBeInTheDocument();
    expect(within(fila).getByText("Cliente 7")).toBeInTheDocument();
    expect(within(fila).getByText("12345678")).toBeInTheDocument();
    expect(within(fila).getByText("$ 45.000")).toBeInTheDocument();
    expect(badgeDeFila(fila)).toHaveTextContent("Entregada");
    expect(within(fila).getByRole("link", { name: /Ver la orden #7/ })).toHaveAttribute(
      "href",
      "/catalogo/admin/ordenes/7",
    );
  });

  it("NO trae encabezados ordenables: el backend de órdenes no acepta ?orden=", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    expect(screen.queryByRole("button", { name: /^Ordenar por/ })).not.toBeInTheDocument();
    for (const llamada of getOrdenes.mock.calls) {
      expect(llamada[0]).not.toHaveProperty("orden");
    }
  });

  it("un total o una cantidad de items en null se muestran como — , NUNCA como $ 0 ni 0", async () => {
    // `total`, `cantidadItems` y `resumen` caen juntos: salen de la misma rama
    // del mapper. `null` significa "no se puede saber"; un `$ 0` afirmaría que
    // la orden no vale nada, que es un dato distinto y falso.
    getOrdenes.mockResolvedValue(
      pagina([orden(1, "PENDIENTE", { total: null, cantidadItems: null, resumen: null })]),
    );
    renderPantalla();
    await esperarGrilla();

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).queryByText("$ 0")).not.toBeInTheDocument();
    expect(within(fila).getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});

describe("AdminOrdenes — el resumen de productos", () => {
  it("el botón de Items es un disclosure que abre y cierra una fila extra", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    expect(boton).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(boton);

    expect(boton).toHaveAttribute("aria-expanded", "true");
    const panel = document.getElementById(boton.getAttribute("aria-controls"));
    expect(panel).toBeTruthy();
    expect(within(panel).getByText("Termo")).toBeInTheDocument();

    await userEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "false");
    // El contenido no se va en el mismo tick: la fila se queda montada
    // mientras colapsa, o no habria animacion de salida.
    await waitFor(() => expect(screen.queryByText("Termo")).not.toBeInTheDocument());
  });

  it("solo hay UN resumen abierto a la vez", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1), orden(2)]));
    renderPantalla();
    await esperarGrilla();

    await userEvent.click(screen.getByRole("button", { name: /productos de la orden #1/ }));
    await userEvent.click(screen.getByRole("button", { name: /productos de la orden #2/ }));

    expect(screen.getByRole("button", { name: /productos de la orden #1/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /productos de la orden #2/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("Escape lo cierra y devuelve el foco al botón que lo abrió", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    await userEvent.click(boton);
    await userEvent.keyboard("{Escape}");

    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveFocus();
  });
});

describe("AdminOrdenes — cambio de estado desde la fila", () => {
  beforeEach(() => {
    getOrdenes.mockResolvedValue(pagina([orden(1, "PENDIENTE")]));
  });

  /** Elige `destino` en el select de la fila #1. */
  async function elegirEstado(destino) {
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Cambiar estado de la orden #1" }),
      destino,
    );
  }

  it("elegir un estado abre el diálogo y NO llama a la API todavía", async () => {
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("EN_PREPARACION");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(actualizarEstadoOrden).not.toHaveBeenCalled();
  });

  it("confirmar guarda y actualiza el badge de la fila", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "EN_PREPARACION",
      estadoEtiqueta: "En preparación",
      items: [{ id: 5, nombreProducto: "Termo", precioUnitario: "22500", cantidad: 2 }],
    });
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actualizarEstadoOrden).toHaveBeenCalledWith(1, "EN_PREPARACION", false);
    expect(badgeDeFila(screen.getAllByRole("row")[1])).toHaveTextContent("En preparación");
  });

  it("la respuesta del PATCH NO le borra el monto ni el resumen a la fila", async () => {
    // ⚠️ El guard más importante de la pantalla. `PATCH /ordenes/:id/estado`
    // responde con la forma DETALLE: trae `items` pero NO `total`, `resumen`
    // ni `cantidadItems`. Un `setOrden(respuesta)` se los arrancaría a la fila
    // sin ningún error y sin test rojo. Se pisan SOLO estado/etiqueta/updatedAt.
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "ENTREGADA",
      estadoEtiqueta: "Entregada",
      updatedAt: "2026-09-02T10:00:00.000Z",
      items: [{ id: 5, nombreProducto: "Termo", precioUnitario: "22500", cantidad: 2 }],
    });
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("ENTREGADA");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).getByText("$ 45.000")).toBeInTheDocument();
    // Si la respuesta hubiera pisado la fila entera, esto sería un guion.
    expect(within(fila).queryByText("—")).not.toBeInTheDocument();
    // Y el resumen sigue teniendo sus líneas: `resumen` tampoco viaja en el PATCH.
    await userEvent.click(screen.getByRole("button", { name: /productos de la orden #1/ }));
    expect(screen.getByText("Termo")).toBeInTheDocument();
  });

  it("muestra las advertencias de stock que devuelve el backend", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "EN_PREPARACION",
      estadoEtiqueta: "En preparación",
      advertencias: ['Stock insuficiente para "Termo": se pidieron 3 unidades.'],
    });
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    expect(await screen.findByTestId("advertencias-stock")).toHaveTextContent(
      /se pidieron 3 unidades/,
    );
  });

  it("avisa cuando el estado se guardó pero el mail no salió", async () => {
    actualizarEstadoOrden.mockResolvedValue({
      id: 1,
      estado: "EN_PREPARACION",
      estadoEtiqueta: "En preparación",
      notificacion: { intentada: true, enviada: false, error: "SMTP caído" },
    });
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("EN_PREPARACION");
    await userEvent.click(await screen.findByRole("button", { name: "Notificar y guardar" }));

    expect(await screen.findByText(/El cliente no fue notificado/)).toBeInTheDocument();
    expect(screen.getByText(/SMTP caído/)).toBeInTheDocument();
  });

  it("un PATCH que falla cierra el diálogo, avisa afuera y DEJA la fila como estaba", async () => {
    actualizarEstadoOrden.mockRejectedValue(new Error("No se pudo actualizar."));
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("ENTREGADA");
    await userEvent.click(await screen.findByRole("button", { name: "Guardar sin notificar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("No se pudo actualizar.")).toBeInTheDocument();
    expect(badgeDeFila(screen.getAllByRole("row")[1])).toHaveTextContent("Pendiente");
  });

  it("cancelar no llama a la API y devuelve el select a su estado real", async () => {
    renderPantalla();
    await esperarGrilla();

    await elegirEstado("CANCELADA");
    await userEvent.click(await screen.findByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(actualizarEstadoOrden).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox", { name: "Cambiar estado de la orden #1" })).toHaveValue(
      "PENDIENTE",
    );
  });
});

describe("AdminOrdenes — chips de estado", () => {
  it("ofrece Todos más un chip por estado, con el conteo del servidor", async () => {
    renderPantalla();
    await esperarGrilla();

    const grupo = within(screen.getByRole("group", { name: "Estado" }));
    expect(grupo.getByRole("button", { name: "Todos (312)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(grupo.getByRole("button", { name: "Pendiente (12)" })).toBeInTheDocument();
    expect(grupo.getByRole("button", { name: "En preparación (4)" })).toBeInTheDocument();
    expect(grupo.getByRole("button", { name: "Entregada (289)" })).toBeInTheDocument();
    expect(grupo.getByRole("button", { name: "Cancelada (7)" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("le pasa al conteo el objeto de filtros ENTERO, sin desarmarlo", async () => {
    // ⚠️ La regla "los mismos filtros que el listado MENOS `estado`" tiene UNA
    // casa: `getConteoOrdenesPorEstado` en `api/ordenes.js`, que lo descarta
    // por destructuring, y su guard vive en `api/ordenes.test.js` afirmando
    // sobre la URL real. Un `estado: undefined` en este call site no era
    // defensa —la función nunca lo lee— sino una segunda copia de la regla, en
    // la capa que no la aplica.
    renderPantalla("/catalogo/admin/ordenes?estado=ENTREGADA&dni=12345678");
    await esperarGrilla();

    await waitFor(() => expect(getConteoOrdenesPorEstado).toHaveBeenCalled());
    expect(getConteoOrdenesPorEstado).toHaveBeenLastCalledWith(
      expect.objectContaining({ dni: "12345678" }),
    );
  });

  it("elegir un chip lo escribe en ?estado= y vuelve a la página 1", async () => {
    renderPantalla("/catalogo/admin/ordenes?page=3");
    await esperarGrilla();

    await userEvent.click(screen.getByRole("button", { name: "Entregada (289)" }));

    await waitFor(() => expect(params().get("estado")).toBe("ENTREGADA"));
    expect(params().get("page")).toBeNull();
  });

  it("un ?estado= viejo de un link sigue filtrando el listado", async () => {
    // El parámetro cambió de significado (era el tab activo del tablero,
    // vuelve a ser el filtro) pero NO de nombre: un link guardado tiene que
    // seguir abriendo lo mismo.
    renderPantalla("/catalogo/admin/ordenes?estado=CANCELADA");
    await esperarGrilla();

    expect(getOrdenes).toHaveBeenCalledWith(expect.objectContaining({ estado: "CANCELADA" }));
    expect(screen.getByRole("button", { name: "Cancelada (7)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("si getEstadosOrden falla, la grilla sigue andando sin chips de estado", async () => {
    // Vuelve a ser un extra: en el tablero los estados ERAN las columnas y sin
    // ellos no había pantalla. En una grilla, sin ellos quedan las órdenes.
    getEstadosOrden.mockRejectedValue(new Error("401"));
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText(/No se pudo cargar/)).not.toBeInTheDocument();
  });
});

describe("AdminOrdenes — filtros de período, búsqueda y DNI", () => {
  it("un preset de período escribe ?dias= , lo manda al backend y vuelve a página 1", async () => {
    renderPantalla("/catalogo/admin/ordenes?page=2");
    await esperarGrilla();

    await userEvent.click(screen.getByRole("button", { name: "7 días" }));

    await waitFor(() => expect(params().get("dias")).toBe("7"));
    expect(params().get("page")).toBeNull();
    await waitFor(() =>
      expect(getOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ dias: "7" })),
    );
  });

  it("escribir una fecha borra el preset de la URL", async () => {
    renderPantalla("/catalogo/admin/ordenes?dias=7");
    await esperarGrilla();

    await userEvent.type(screen.getByLabelText("Desde"), "2026-01-15");

    await waitFor(() => expect(params().get("desde")).toBe("2026-01-15"));
    expect(params().get("dias")).toBeNull();
  });

  it("avisa cuando el backend recortó el período pedido", async () => {
    getOrdenes.mockResolvedValue(
      pagina([orden(1)], {
        periodo: { desde: "2026-08-01", hasta: "2026-09-01", recortado: true },
      }),
    );
    renderPantalla("/catalogo/admin/ordenes?dias=365");
    await esperarGrilla();

    expect(await screen.findByTestId("advertencia-periodo-recortado")).toBeInTheDocument();
  });

  it("la búsqueda viaja como ?nombre= al backend y como ?search= en la URL", async () => {
    renderPantalla();
    await esperarGrilla();

    await userEvent.type(screen.getByLabelText(/Buscar por nombre/), "Ana");

    await waitFor(() => expect(params().get("search")).toBe("Ana"));
    await waitFor(() =>
      expect(getOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ nombre: "Ana" })),
    );
  });

  it("el chip de DNI se inicializa desde la URL, viaja al backend y se puede quitar", async () => {
    renderPantalla("/catalogo/admin/ordenes?dni=12345678");
    await esperarGrilla();

    expect(screen.getByText(/DNI: 12345678/)).toBeInTheDocument();
    expect(getOrdenes).toHaveBeenCalledWith(expect.objectContaining({ dni: "12345678" }));

    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro por DNI" }));

    await waitFor(() => expect(params().get("dni")).toBeNull());
  });
});

describe("AdminOrdenes — estados de la pantalla", () => {
  it("un error de carga muestra EstadoVacio con cloud_off, y un fetch exitoso lo limpia", async () => {
    // Esta pantalla RESPONDE "¿hay órdenes?": un catch que solo vacía la lista
    // le afirma al admin que no entró ningún pedido cuando el backend está
    // caído. Y el error tiene que irse solo cuando el siguiente fetch anda.
    getOrdenes.mockRejectedValueOnce(new Error("Network down"));
    renderPantalla();
    await esperarGrilla();

    expect(await screen.findByText("No se pudieron cargar las órdenes")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(document.body.textContent).toContain("cloud_off");

    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    await userEvent.click(screen.getByRole("button", { name: /Actualizar/ }));

    await waitFor(() =>
      expect(screen.queryByText("No se pudieron cargar las órdenes")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  // ⚠️ Los dos casos van SEPARADOS a propósito. Montar la pantalla dos veces
  // en el mismo `document` sin `cleanup` deja las dos copias vivas: los
  // `getBy*` pasan de casualidad porque los textos difieren, y el día que dos
  // pantallas compartan un texto el error dice "found multiple elements" en un
  // test que no habla de eso.
  it("vacío SIN filtro dice que todavía no entró ninguna orden", async () => {
    renderPantalla();
    await esperarGrilla();

    expect(screen.getByText("Todavía no hay órdenes")).toBeInTheDocument();
    expect(screen.queryByText("Sin resultados")).not.toBeInTheDocument();
  });

  it("vacío CON filtro dice que ninguna orden coincide, no que no hay órdenes", async () => {
    renderPantalla("/catalogo/admin/ordenes?estado=CANCELADA");
    await esperarGrilla();

    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay órdenes")).not.toBeInTheDocument();
  });

  it("mientras carga muestra el spinner y no la tabla", async () => {
    getOrdenes.mockReturnValue(new Promise(() => {}));
    renderPantalla();

    expect(await screen.findByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});

describe("AdminOrdenes — paginación", () => {
  it("usa el Paginador compartido y escribe la página en la URL", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)], { total: 45, pageSize: 20 }));
    renderPantalla();
    await esperarGrilla();

    const paginador = screen.getByRole("navigation", { name: "Paginación de órdenes" });
    await userEvent.click(within(paginador).getByRole("button", { name: "Página 2" }));

    await waitFor(() => expect(params().get("page")).toBe("2"));
    await waitFor(() =>
      expect(getOrdenes).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
    );
  });

  it("una página fuera de rango retrocede a la última en vez de decir que no hay órdenes", async () => {
    // Un `?page=99` guardado deja la tabla vacía, y ahí "Todavía no hay
    // órdenes" es literalmente falso sobre un listado con 45. Mismo criterio
    // que la corrección de página de `AdminProductos`.
    getOrdenes.mockResolvedValue(pagina([], { page: 99, pageSize: 20, total: 45 }));
    renderPantalla("/catalogo/admin/ordenes?page=99");
    await esperarGrilla();

    await waitFor(() => expect(params().get("page")).toBe("3"));
  });

  it("no dibuja botones caseros de Anterior/Siguiente", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)], { total: 45, pageSize: 20 }));
    renderPantalla();
    await esperarGrilla();

    expect(screen.queryByRole("button", { name: "Anterior" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiente" })).not.toBeInTheDocument();
  });
});

describe("AdminOrdenes — el despliegue del resumen", () => {
  /** El envoltorio que anima: se marca con `data-despliegue` para poder verlo. */
  function envoltorioDe(boton) {
    const panel = document.getElementById(boton.getAttribute("aria-controls"));
    return panel?.closest("[data-despliegue]") ?? null;
  }

  it("anima con grid-template-rows (0fr → 1fr), sin ningún max-height mágico", async () => {
    // ⚠️ La técnica NO es negociable: `max-h-[valor]` corta el contenido de una
    // orden con muchos productos y hace durar de más la de un solo renglón.
    // `grid-template-rows: 0fr → 1fr` anima hasta la altura REAL sin conocerla.
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    await userEvent.click(boton);

    const envoltorio = envoltorioDe(boton);
    expect(envoltorio).toBeTruthy();
    // El `1fr` llega un frame despues del montaje a proposito: con el valor
    // final ya presente en el primer estilo calculado no hay nada que
    // interpolar y el panel aparece de golpe.
    await waitFor(() => expect(envoltorio.className).toContain("grid-rows-[1fr]"));
    expect(envoltorio.className).not.toMatch(/max-h-/);
    // El hijo que recorta es el que hace posible el 0fr: sin `overflow-hidden`
    // el contenido se desborda y no se ve ninguna animación.
    expect(envoltorio.firstElementChild.className).toContain("overflow-hidden");
  });

  it("prefers-reduced-motion anula la animación", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    await userEvent.click(boton);

    expect(envoltorioDe(boton).className).toContain("motion-reduce:transition-none");
  });

  it("al cerrar, la fila del resumen sigue montada mientras colapsa", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    await userEvent.click(boton);
    await userEvent.click(boton);

    // Desmontarla en el mismo tick sería un salto brusco: no hay animación de
    // salida sobre un nodo que ya no está.
    const envoltorio = envoltorioDe(boton);
    expect(envoltorio).toBeTruthy();
    expect(envoltorio.getAttribute("data-despliegue")).toBe("cerrado");
    expect(envoltorio.className).toContain("grid-rows-[0fr]");

    await waitFor(() => expect(envoltorioDe(boton)).toBeNull());
  });

  it("con el resumen abierto, la fila de la orden no lleva borde contra él", async () => {
    // La fila y su resumen tienen que leerse como UN cuadrante: el borde va
    // recién al final del bloque, no entre la orden y su propio detalle.
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    const fila = boton.closest("tr");
    expect(fila).toHaveClass("border-b");

    await userEvent.click(boton);
    expect(fila).not.toHaveClass("border-b");
  });
});

describe("AdminOrdenes — el nombre accesible del disclosure", () => {
  it("con cantidadItems en null NO afirma «0 productos»", async () => {
    // El texto visible ya dice `—` (no se puede saber). El nombre accesible
    // decía "Ver los 0 productos", que es la misma afirmación falsa que la
    // fila tiene prohibida — solo que audible en vez de visible.
    getOrdenes.mockResolvedValue(
      pagina([orden(1, "PENDIENTE", { total: null, cantidadItems: null, resumen: null })]),
    );
    renderPantalla();
    await esperarGrilla();

    expect(screen.queryByRole("button", { name: /0 productos/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ver los productos de la orden #1" }),
    ).toBeInTheDocument();
  });

  it("con cantidadItems cargado sí dice cuántos son", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1, "PENDIENTE", { cantidadItems: 3 })]));
    renderPantalla();
    await esperarGrilla();

    expect(
      screen.getByRole("button", { name: "Ver los 3 productos de la orden #1" }),
    ).toBeInTheDocument();
  });
});

describe("AdminOrdenes — los conteos de los chips", () => {
  it("si el conteo falla, la grilla sigue usable y los chips pierden el número", async () => {
    // ⚠️ El guard de que los tres pedidos NO se junten en un `Promise.all`:
    // con uno solo caído, un `all` blanquearía la pantalla entera. El conteo
    // es un extra; el listado es la pantalla.
    getConteoOrdenesPorEstado.mockRejectedValue(new Error("500"));
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.queryByText("No se pudieron cargar las órdenes")).not.toBeInTheDocument();

    const grupo = within(screen.getByRole("group", { name: "Estado" }));
    expect(grupo.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(grupo.getByRole("button", { name: "Pendiente" })).toBeInTheDocument();
    // Un `0` afirmaría que no hay ninguna orden en ese estado, que es otro dato.
    expect(grupo.queryByRole("button", { name: /\(0\)/ })).not.toBeInTheDocument();
  });

  it("se piden con el MISMO período y filtros que la grilla", async () => {
    // Si el conteo pierde el período, los chips cuentan sobre un universo
    // distinto del que muestra la tabla de abajo — y nada se pone rojo.
    renderPantalla("/catalogo/admin/ordenes?desde=2026-01-01&hasta=2026-01-31&dni=12345678");
    await esperarGrilla();

    await waitFor(() => expect(getConteoOrdenesPorEstado).toHaveBeenCalled());
    const ultimaGrilla = getOrdenes.mock.calls.at(-1)[0];
    const ultimoConteo = getConteoOrdenesPorEstado.mock.calls.at(-1)[0];

    for (const clave of ["desde", "hasta", "dias", "dni", "nombre"]) {
      expect(ultimoConteo?.[clave]).toEqual(ultimaGrilla?.[clave]);
    }
  });
});

describe("AdminOrdenes — el resumen abierto no sobrevive a un cambio de vista", () => {
  it("se cierra al cambiar de página", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)], { total: 45, pageSize: 20 }));
    renderPantalla();
    await esperarGrilla();

    const boton = screen.getByRole("button", { name: /productos de la orden #1/ });
    await userEvent.click(boton);
    expect(boton).toHaveAttribute("aria-expanded", "true");

    const paginador = screen.getByRole("navigation", { name: "Paginación de órdenes" });
    await userEvent.click(within(paginador).getByRole("button", { name: "Página 2" }));

    // Quedaría abierto sobre una fila que ya no es la misma orden.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /productos de la orden #1/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });

  it("se cierra al cambiar un filtro", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    await userEvent.click(screen.getByRole("button", { name: /productos de la orden #1/ }));
    await userEvent.click(screen.getByRole("button", { name: "7 días" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /productos de la orden #1/ })).toHaveAttribute(
        "aria-expanded",
        "false",
      ),
    );
  });
});

describe("AdminOrdenes — el select de estado sin diccionario", () => {
  it("sin la lista de estados conserva el estado actual como única opción", async () => {
    // Un select vacío no dice en qué estado está la orden y no deja moverla a
    // ningún lado: el fallback al menos AFIRMA el estado real.
    getEstadosOrden.mockRejectedValue(new Error("401"));
    getOrdenes.mockResolvedValue(pagina([orden(1, "ENTREGADA")]));
    renderPantalla();
    await esperarGrilla();

    const select = screen.getByRole("combobox", { name: "Cambiar estado de la orden #1" });
    const opciones = within(select).getAllByRole("option");
    expect(opciones).toHaveLength(1);
    expect(opciones[0]).toHaveValue("ENTREGADA");
    expect(opciones[0]).toHaveTextContent("Entregada");
  });

  it("Actualizar reintenta la lista de estados cuando su primer fetch falló", async () => {
    // La grilla absorbió el camino de ESCRITURA que antes tenía el tablero:
    // sin estados no se puede mover ninguna orden, y el botón que la persona
    // va a apretar tiene que poder arreglarlo.
    getEstadosOrden.mockRejectedValueOnce(new Error("500"));
    getEstadosOrden.mockResolvedValue(ESTADOS);
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    expect(screen.queryByRole("button", { name: /^Pendiente/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Actualizar/ }));

    expect(await screen.findByRole("button", { name: /^Pendiente/ })).toBeInTheDocument();
  });
});

describe("AdminOrdenes — el período que el backend devuelve", () => {
  it("muestra el rango efectivo cuando NO es el que la pantalla pidió", async () => {
    // ⚠️ Con solo "Hasta" cargado, el backend completa el "Desde" con su
    // ventana por defecto y responde `recortado: false`. El input sigue vacío
    // en pantalla: sin este aviso, el admin cree estar viendo el histórico
    // entero y está viendo un mes.
    getOrdenes.mockResolvedValue(
      pagina([orden(1)], {
        periodo: { desde: "2026-08-08", hasta: "2026-09-07", recortado: false },
      }),
    );
    renderPantalla("/catalogo/admin/ordenes?hasta=2026-09-07");
    await esperarGrilla();

    const aviso = await screen.findByTestId("periodo-efectivo");
    expect(aviso).toHaveTextContent("08/08/2026");
    expect(aviso).toHaveTextContent("07/09/2026");
  });

  it("también lo muestra con un ?desde= que el backend no pudo interpretar", async () => {
    getOrdenes.mockResolvedValue(
      pagina([orden(1)], {
        periodo: { desde: "2026-08-08", hasta: "2026-09-07", recortado: false },
      }),
    );
    renderPantalla("/catalogo/admin/ordenes?desde=basura");
    await esperarGrilla();

    expect(await screen.findByTestId("periodo-efectivo")).toHaveTextContent("08/08/2026");
  });

  it("NO lo muestra cuando el rango efectivo es exactamente el pedido", async () => {
    getOrdenes.mockResolvedValue(
      pagina([orden(1)], {
        periodo: { desde: "2026-01-01", hasta: "2026-01-31", recortado: false },
      }),
    );
    renderPantalla("/catalogo/admin/ordenes?desde=2026-01-01&hasta=2026-01-31");
    await esperarGrilla();

    expect(screen.queryByTestId("periodo-efectivo")).not.toBeInTheDocument();
  });

  it("con un recorte deja hablar al aviso de recorte, sin duplicar el rango", async () => {
    getOrdenes.mockResolvedValue(
      pagina([orden(1)], {
        periodo: { desde: "2026-08-01", hasta: "2026-09-01", recortado: true },
      }),
    );
    renderPantalla("/catalogo/admin/ordenes?dias=365");
    await esperarGrilla();

    expect(await screen.findByTestId("advertencia-periodo-recortado")).toBeInTheDocument();
    expect(screen.queryByTestId("periodo-efectivo")).not.toBeInTheDocument();
  });

  it("sin filtro de período no hay nada que aclarar", async () => {
    getOrdenes.mockResolvedValue(pagina([orden(1)]));
    renderPantalla();
    await esperarGrilla();

    expect(screen.queryByTestId("periodo-efectivo")).not.toBeInTheDocument();
  });
});
