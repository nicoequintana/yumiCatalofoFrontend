import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductosSolicitados from "./AdminProductosSolicitados.jsx";
import * as ordenesApi from "../../api/ordenes.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/ordenes.js");

const MATE = {
  productId: 7,
  sku: "YIMA-MATE-1234",
  nombre: "Mate imperial",
  unidades: 5,
  ordenes: 2,
  facturacion: "45000",
};

function respuesta(data, historico = {}) {
  return {
    data,
    historico: { ordenesAnalizadas: data.length, tope: 20000, recortado: false, ...historico },
  };
}

function renderPagina() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/ordenes/productos-solicitados"]}>
      <AdminProductosSolicitados />
    </MemoryRouter>,
  );
}

describe("AdminProductosSolicitados", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([MATE]));
    ordenesApi.descargarProductosSolicitados.mockResolvedValue(undefined);
  });

  it("muestra la fila agrupada con SKU, unidades, ordenes y facturacion", async () => {
    renderPagina();

    expect(await screen.findByText("Mate imperial")).toBeInTheDocument();
    expect(screen.getByText("YIMA-MATE-1234")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("$ 45.000")).toBeInTheDocument();
  });

  it("muestra un guion en el SKU del producto borrado", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(
      respuesta([{ ...MATE, productId: null, sku: null }]),
    );

    renderPagina();

    await screen.findByText("Mate imperial");
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("distingue 'no hay nada' de 'fallo la carga'", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([]));

    renderPagina();

    expect(await screen.findByText("Todavía no hay productos solicitados")).toBeInTheDocument();
  });

  it("avisa cuando la carga falla, en vez de mostrar la pantalla vacia", async () => {
    ordenesApi.getProductosSolicitados.mockRejectedValue(new Error("caído"));

    renderPagina();

    expect(await screen.findByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay productos solicitados")).not.toBeInTheDocument();
  });

  it("descarga el Excel al apretar el boton", async () => {
    const user = userEvent.setup();
    renderPagina();

    await screen.findByText("Mate imperial");
    await user.click(screen.getByRole("button", { name: /descargar excel/i }));

    expect(ordenesApi.descargarProductosSolicitados).toHaveBeenCalledTimes(1);
  });

  it("no ofrece la descarga cuando no hay nada que exportar", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([]));

    renderPagina();

    await screen.findByText("Todavía no hay productos solicitados");
    expect(screen.queryByRole("button", { name: /descargar excel/i })).not.toBeInTheDocument();
  });

  it("avisa si la descarga falla, sin romper la grilla", async () => {
    const user = userEvent.setup();
    ordenesApi.descargarProductosSolicitados.mockRejectedValue(new Error("no se pudo"));

    renderPagina();
    await screen.findByText("Mate imperial");
    await user.click(screen.getByRole("button", { name: /descargar excel/i }));

    expect(await screen.findByText("no se pudo")).toBeInTheDocument();
    expect(screen.getByText("Mate imperial")).toBeInTheDocument();
  });

  it("declara que el historico quedo recortado", async () => {
    ordenesApi.getProductosSolicitados.mockResolvedValue(
      respuesta([MATE], { recortado: true, ordenesAnalizadas: 20000 }),
    );

    renderPagina();

    expect(await screen.findByTestId("aviso-historico")).toBeInTheDocument();
  });

  it("no muestra el aviso de recorte cuando entro todo", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    expect(screen.queryByTestId("aviso-historico")).not.toBeInTheDocument();
  });

  it("pide los datos una sola vez al montar", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    await waitFor(() => expect(ordenesApi.getProductosSolicitados).toHaveBeenCalledTimes(1));
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    esperarTablaApilada(screen.getByRole("table"));
  });
});

/**
 * Área táctil (WCAG 2.5.8, mínimo 44×44).
 *
 * ⚠️ **Esta pantalla se le escapó ENTERA al barrido original del 07/09/2026**:
 * no estaba en la lista de rutas que recorría la auditoría, y apareció recién
 * cotejando esa lista contra `App.jsx`. Cuelga de
 * `/catalogo/admin/ordenes/productos-solicitados`, o sea de un segmento literal
 * dentro de la rama del detalle de orden — a la que solo se llega desde el
 * listado de órdenes. Vale la pena dejarlo escrito: la próxima auditoría se
 * arma desde `App.jsx`, no desde las pantallas que uno recuerda.
 *
 * Medido en navegador el 07/09/2026 con `elementFromPoint` (área EFECTIVA, no
 * `getBoundingClientRect`), a 390px y a 1280px — los tres daban lo mismo en los
 * dos anchos, así que lo que falta es el ALTO y no el ancho:
 *
 * - link de volver "Órdenes": **93×18** (caja 98×17)
 * - botón "Descargar Excel": **93×43** (caja 221×42)
 * - link al nombre del producto: **93×22** (caja 295×21)
 *
 * jsdom no hace layout: acá se afirma sobre la CLASE declarada, igual que en
 * `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`. La medición real es
 * en navegador; el test protege que nadie devuelva el tamaño por debajo del
 * mínimo sin darse cuenta.
 */
describe("AdminProductosSolicitados · área táctil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([MATE]));
    ordenesApi.descargarProductosSolicitados.mockResolvedValue(undefined);
  });

  // Pseudo-elemento y no `min-h-11`: el link vive pegado al `<h1>` de la
  // pantalla, y estirarle la caja empujaría el encabezado 27px hacia abajo.
  // `before:w-full` porque el ancho ya sobra (93 medidos): copiar el propio
  // evita invadir lo que tenga al lado.
  it("el link de volver a Órdenes llega a 44 de alto por pseudo-elemento", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    const enlace = screen.getByRole("link", { name: /órdenes/i });
    expect(enlace.className).toContain("relative");
    // `content-['']` no es decorativo: sin él el pseudo-elemento no genera caja
    // y el área táctil sigue siendo la de antes, sin que nada falle.
    expect(enlace.className).toContain("before:content-['']");
    expect(enlace.className).toContain("before:h-11");
    expect(enlace.className).toContain("before:w-full");
  });

  // El CTA puede crecer sin costo de diseño (está solo en su columna del
  // encabezado), así que lleva el piso real. `min-h-11` va ADEMÁS del `py-3`
  // de la variante, nunca en lugar de él: el mínimo táctil es un PISO.
  it("el botón Descargar Excel declara el piso táctil de 44 de alto", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");
    const boton = screen.getByRole("button", { name: /descargar excel/i });
    expect(boton.className.split(" ")).toContain("min-h-11");
    // El tamaño visible de la variante se conserva.
    expect(boton.className.split(" ")).toContain("py-3");
  });

  // Pseudo-elemento: es una COLUMNA de la tabla. Medido el paso vertical real
  // de fila el 07/09/2026 — `px-4 py-3` sobre un texto de 21px da 45px de alto
  // de celda más 1px de borde, o sea **46 de paso**, por encima de los 44 del
  // área: dos filas contiguas no se superponen y ninguna le roba área a la de
  // arriba. Por debajo de `md` la fila pasa a tarjeta (`tabla-apilada`) y la
  // celda `identidad` queda sola en su línea, así que tampoco hay vecino.
  // El `overflow-x-auto` del envoltorio tampoco recorta: el pseudo entra
  // entero dentro de la celda (0,5 → 44,5 sobre 45).
  it("el link al nombre del producto llega a 44 de alto por pseudo-elemento", async () => {
    renderPagina();

    const enlace = await screen.findByRole("link", { name: "Mate imperial" });
    expect(enlace.className).toContain("before:content-['']");
    expect(enlace.className).toContain("before:h-11");
    // El ancho ya sobra (295 de caja): copia el propio en vez de fijar 44 e
    // invadir la celda de al lado.
    expect(enlace.className).toContain("before:w-full");
  });
});

/**
 * La ruta vive bajo `/catalogo/admin/ordenes/`, que ya tiene un segmento
 * dinámico (`:id`, el detalle de orden). React Router resuelve por
 * especificidad y no por orden de declaración, así que el segmento literal
 * gana — pero de eso depende que la pantalla exista, y si alguna vez dejara de
 * cumplirse la falla sería un "orden no encontrada" en vez de la grilla.
 *
 * Los paths van literales, igual que en `App.jsx`: el repo no tiene un módulo
 * de rutas del que importarlos.
 */
describe("ruteo de /catalogo/admin/ordenes/productos-solicitados", () => {
  function renderRutas() {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/ordenes/productos-solicitados"]}>
        <Routes>
          <Route path="/catalogo/admin/ordenes/:id" element={<p>detalle de orden</p>} />
          <Route
            path="/catalogo/admin/ordenes/productos-solicitados"
            element={<p>grilla agrupada</p>}
          />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("no queda tapada por el detalle de orden", () => {
    renderRutas();

    expect(screen.getByText("grilla agrupada")).toBeInTheDocument();
    expect(screen.queryByText("detalle de orden")).not.toBeInTheDocument();
  });
});

/**
 * El ligature del ícono NO puede entrar en el nombre accesible. Verificado con
 * el árbol de accesibilidad real el 07/09/2026: el link se anunciaba
 * **"arrow_back Órdenes"**. `BotonVolver.jsx:50-51` documenta y resuelve esta
 * misma trampa, pero acá el link está escrito a mano y no usa ese componente.
 *
 * El chequeo de "controles sin nombre" no lo agarra: nombre TIENE, solo que
 * dice de más. Por eso el test afirma el nombre EXACTO y no un `/órdenes/i`.
 */
describe("AdminProductosSolicitados — nombre accesible del link de volver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ordenesApi.getProductosSolicitados.mockResolvedValue(respuesta([MATE]));
    ordenesApi.descargarProductosSolicitados.mockResolvedValue(undefined);
  });

  it("se anuncia solo como “Órdenes”, sin el ligature del ícono", async () => {
    renderPagina();

    await screen.findByText("Mate imperial");

    expect(screen.getByRole("link", { name: "Órdenes" })).toBeInTheDocument();
  });
});
