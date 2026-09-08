import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminCampanias from "./AdminCampanias.jsx";
import * as campaniasApi from "../../api/campanias.js";
import * as promocionesApi from "../../api/promociones.js";
import { reiniciarContextoComercial } from "../../hooks/useContextoComercial.js";

vi.mock("../../api/campanias.js");
vi.mock("../../api/promociones.js");

/**
 * El Centro de Campañas ya NO edita: NAVEGA.
 *
 * Es lo que sostiene que el editor sea una página. Si el calendario volviera a
 * abrir un diálogo, el selector de productos quedaría dentro de un modal — que
 * es exactamente el flujo dentro de un flujo que este paso vino a sacar.
 *
 * ⚠️ `useContextoComercial` es una dependencia implícita: sin `claveDia` la
 * pantalla no sabe qué mes abrir y se queda en el spinner. Y su estado vive a
 * nivel de módulo, así que hay que reiniciarlo entre casos.
 */

const CAMPANIA = {
  id: 31,
  nombre: "Primavera 2026",
  tipo: "ESTACIONAL",
  estado: "HABILITADA",
  desde: "2026-09-21",
  hasta: "2026-09-30",
  prioridad: 5,
  estadoTemporal: "ACTIVA",
  activa: true,
  etiquetaEstado: "Habilitada",
  etiquetaTemporal: "Activa",
  doodleUrl: null,
  modalActivo: false,
  cantidadProductos: 0,
};

function AltaFalsa() {
  const [parametros] = useSearchParams();
  return <div>Alta con dia={parametros.get("dia")}</div>;
}

function renderCentro() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/campanias"]}>
      <Routes>
        <Route path="/catalogo/admin/campanias" element={<AdminCampanias />} />
        <Route path="/catalogo/admin/campanias/nueva" element={<AltaFalsa />} />
        <Route path="/catalogo/admin/campanias/:id/editar" element={<div>Editor de la 31</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarContextoComercial();
  campaniasApi.getContextoComercial.mockResolvedValue({
    claveDia: "2026-09-04",
    doodle: null,
    doodleAdmin: null,
    modal: null,
  });
  campaniasApi.getCampanias.mockResolvedValue([CAMPANIA]);
  promocionesApi.getProgramaciones.mockResolvedValue([]);
  promocionesApi.getPromociones.mockResolvedValue([]);
});

describe("AdminCampanias — el calendario navega al editor", () => {
  it("tocar el nombre de una campaña abre su página de edición", async () => {
    const usuario = userEvent.setup();
    renderCentro();

    await usuario.click(await screen.findByRole("button", { name: "Primavera 2026" }));

    expect(screen.getByText("Editor de la 31")).toBeInTheDocument();
    // Ya no se pide el detalle desde acá: lo carga el editor.
    expect(campaniasApi.getCampania).not.toHaveBeenCalled();
  });

  it("«Editar» abre la misma página", async () => {
    const usuario = userEvent.setup();
    renderCentro();

    await usuario.click(await screen.findByRole("button", { name: "Editar" }));

    expect(screen.getByText("Editor de la 31")).toBeInTheDocument();
  });

  it("«Nueva campaña» abre el alta con el día del backend precargado", async () => {
    const usuario = userEvent.setup();
    renderCentro();

    await usuario.click(await screen.findByRole("button", { name: "Nueva campaña" }));

    // El día lo manda el backend (`claveDia`), nunca el reloj del navegador.
    expect(screen.getByText("Alta con dia=2026-09-04")).toBeInTheDocument();
  });
});

/**
 * Guard del ÁREA TÁCTIL del Centro de Campañas.
 *
 * Medido en navegador el 07/09/2026 a 1280×800 con `elementFromPoint` (área
 * EFECTIVA, no la caja declarada). Solo a 1280 porque la pantalla es solo
 * escritorio (`SoloEscritorio.jsx`): «Programar promoción» 43 de alto,
 * «Apagar» 33, «Editar» 33 y el nombre de la campaña 25 — los cuatro por
 * debajo del mínimo de 44×44 (WCAG 2.5.8).
 *
 * jsdom no calcula layout: se afirma sobre las CLASES declaradas, igual que en
 * `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`.
 */
describe("AdminCampanias — área táctil", () => {
  it.each([["Programar promoción"], ["Nueva campaña"], ["Apagar"], ["Editar"]])(
    "«%s» declara el mínimo táctil de 44 de alto",
    async (nombre) => {
      renderCentro();

      const boton = await screen.findByRole("button", { name: nombre });
      expect(boton.className.split(" ")).toContain("min-h-11");
    },
  );

  it("los botones del panel de una promoción programada llegan a 44 de alto", async () => {
    // Un control que solo existe con el diálogo ABIERTO no lo ve un barrido
    // sobre la pantalla en reposo: por eso estos quedaron fuera de la medición
    // del 07/09/2026. La caja declarada alcanza para saberlo igual — `py-3`
    // con `text-label-md` da los mismos 43 que dieron medidos los botones
    // gemelos de la pantalla («Programar promoción», 43 de área efectiva).
    const usuario = userEvent.setup();
    promocionesApi.getProgramaciones.mockResolvedValue([
      {
        id: 9,
        nombre: "Promo TEST",
        desde: "2026-09-03",
        hasta: "2026-09-05",
        habilitada: false,
      },
    ]);
    renderCentro();

    await usuario.click(await screen.findByRole("button", { name: /Promo TEST/ }));

    // Apagada, así que el botón dice «Encender» y no se confunde con el
    // «Apagar» de la fila de la campaña.
    for (const nombre of ["Encender", "Quitar del calendario"]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" ")).toContain("min-h-11");
    }
  });

  it("el nombre de la campaña extiende su área sin crecer de tamaño visible", async () => {
    // Es texto en línea dentro de una celda: agrandar la caja empujaría la
    // fila entera. El pseudo-elemento copia el ancho propio (`before:w-full`)
    // para no invadir la celda de al lado.
    renderCentro();

    const boton = await screen.findByRole("button", { name: "Primavera 2026" });
    expect(boton.className).toContain("relative");
    expect(boton.className).toContain("before:content-['']");
    expect(boton.className).toContain("before:h-11");
    expect(boton.className).toContain("before:w-full");
  });
});
