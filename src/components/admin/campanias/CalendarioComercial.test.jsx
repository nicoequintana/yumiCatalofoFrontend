import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendarioComercial from "./CalendarioComercial.jsx";

/**
 * Guard del ÁREA TÁCTIL del calendario comercial.
 *
 * Medido en navegador el 07/09/2026 a 1280×800 con `elementFromPoint` (área
 * EFECTIVA, no la caja declarada) sobre `/catalogo/admin/campanias`, que es
 * pantalla solo escritorio (`SoloEscritorio.jsx`) y por eso no se mide a 390:
 *
 * - «Mes anterior» 39×39, «Mes siguiente» 38×39, «Hoy» 70×36;
 * - las barras de campaña del calendario, 23 y 26 de alto.
 *
 * Todos por debajo del mínimo táctil de 44×44 (WCAG 2.5.8).
 *
 * jsdom no calcula layout, así que acá se afirma sobre las CLASES declaradas y
 * sobre el `minHeight` en línea de la celda — el mismo criterio que
 * `SelectorCantidad.test.jsx` y `BotonFavorito.test.jsx`.
 */

const CAMPANIA = {
  tipo: "CAMPANIA",
  id: 31,
  nombre: "Primavera TEST",
  estado: "HABILITADA",
  estadoTemporal: "ACTIVA",
  etiquetaEstado: "Habilitada",
  etiquetaTemporal: "Activa",
  desde: "2026-09-21",
  hasta: "2026-09-25",
};

function renderCalendario(elementos = [CAMPANIA]) {
  return render(
    <CalendarioComercial
      mesVisible={{ ano: 2026, mes: 8 }}
      onCambiarMes={vi.fn()}
      elementos={elementos}
      claveHoy="2026-09-22"
      onSeleccionarDia={vi.fn()}
      onSeleccionar={vi.fn()}
    />,
  );
}

describe("CalendarioComercial — área táctil", () => {
  it.each([
    ["Mes anterior"],
    ["Mes siguiente"],
  ])("«%s» declara el mínimo táctil de 44×44", (nombre) => {
    renderCalendario();

    const boton = screen.getByRole("button", { name: nombre });
    expect(boton.className.split(" ")).toContain("min-h-11");
    expect(boton.className.split(" ")).toContain("min-w-11");
  });

  it("«Hoy» llega a 44 de alto sin perder su ancho propio", () => {
    renderCalendario();

    const boton = screen.getByRole("button", { name: "Hoy" });
    expect(boton.className.split(" ")).toContain("min-h-11");
    // El ancho ya sobra (70 medidos): el `px-4` de la variante se conserva.
    expect(boton.className.split(" ")).toContain("px-4");
  });

  it("la barra de un elemento llega a 44 de alto", () => {
    renderCalendario();

    const barra = screen.getByRole("button", { name: /Primavera TEST/ });
    expect(barra.className.split(" ")).toContain("min-h-11");
  });

  it("la celda del día reserva el alto REAL de cada carril, para que dos barras no se pisen", () => {
    // Las barras se apilan dentro de la celda de un día. Si el alto reservado
    // por carril fuera menor que la barra, la de más abajo en el DOM le comería
    // el área a la de arriba: el paso vertical tiene que ser al menos
    // 44 (barra) + 4 (gap) = 48px = 3rem.
    renderCalendario();

    // jsdom no aplica CSS, así que el nombre accesible del día sale pegado:
    // el número y el texto para lector de pantalla sin espacio en el medio.
    const dia = screen.getByRole("button", { name: /^21\s*Crear campaña este día$/ });
    const reservado = Number.parseFloat(dia.style.minHeight);

    // 3.5rem del número del día + 3rem del único carril ocupado.
    expect(reservado).toBeGreaterThanOrEqual(6.5);
  });
});
