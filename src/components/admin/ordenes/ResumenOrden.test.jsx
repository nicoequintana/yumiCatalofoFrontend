import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ResumenOrden from "./ResumenOrden.jsx";

const LINEAS = [
  { nombreProducto: "Termo Stanley", cantidad: 2 },
  { nombreProducto: "Mate imperial", cantidad: 1 },
];

function montar(props = {}) {
  render(
    <ResumenOrden
      id="panel-resumen"
      resumen={props.resumen === undefined ? LINEAS : props.resumen}
      cantidadItems={props.cantidadItems === undefined ? 3 : props.cantidadItems}
      montoFormateado={props.montoFormateado ?? "$ 45.000"}
      {...(props.flotante === undefined ? {} : { flotante: props.flotante })}
    />,
  );
  return document.getElementById("panel-resumen");
}

describe("ResumenOrden — el contenido", () => {
  it("lista cada línea con su cantidad y cierra con el total", () => {
    montar();

    expect(screen.getByText("Termo Stanley")).toBeInTheDocument();
    expect(screen.getByText("x 2")).toBeInTheDocument();
    expect(screen.getByText("Mate imperial")).toBeInTheDocument();
    expect(screen.getByText("x 1")).toBeInTheDocument();
    expect(screen.getByText("$ 45.000")).toBeInTheDocument();
  });

  it("cuenta las líneas que el backend dejó afuera del resumen", () => {
    // El backend topea el resumen en 5 líneas pero `cantidadItems` cuenta
    // todas: sin esta cuenta, una orden de nueve productos se leería como de
    // dos.
    montar({ cantidadItems: 9 });

    expect(screen.getByText("y 7 productos más")).toBeInTheDocument();
  });

  it("singulariza el sobrante de una sola línea", () => {
    montar({ cantidadItems: 3 });

    expect(screen.getByText("y 1 producto más")).toBeInTheDocument();
  });

  it("sin sobrante no dibuja la cuenta", () => {
    montar({ cantidadItems: 2 });

    expect(screen.queryByText(/producto[s]? más/)).not.toBeInTheDocument();
  });

  it("sin resumen lo dice, en vez de mostrar una lista vacía", () => {
    // `resumen`, `total` y `cantidadItems` caen juntos: una lista vacía sin
    // texto afirmaría que la orden no tiene productos, que es otra cosa.
    montar({ resumen: null, cantidadItems: null });

    expect(screen.getByText("No se pudo cargar el detalle de esta orden.")).toBeInTheDocument();
  });

  it("lleva el id que apunta el aria-controls de su disparador", () => {
    const panel = montar();

    expect(panel).toBeTruthy();
  });
});

describe("ResumenOrden — flotante", () => {
  it("por defecto va EMBEBIDO: sin posicionamiento propio ni marco de tarjeta", () => {
    // El default sirve al único consumidor vivo (la fila expandible de la
    // grilla). Flotando dibujaría una tarjeta aparte sobre la fila siguiente.
    const panel = montar();

    expect(panel.className).not.toContain("absolute");
    expect(panel.className).not.toContain("shadow-ambient");
    expect(panel.className).not.toContain("border-outline-variant");
  });

  it("con flotante se ancla a su contenedor relativo y se dibuja como tarjeta", () => {
    const panel = montar({ flotante: true });

    expect(panel.className).toContain("absolute");
    expect(panel.className).toContain("shadow-ambient");
  });
});
