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
