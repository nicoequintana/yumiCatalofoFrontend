import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TablaErroresImportacion from "./TablaErroresImportacion.jsx";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

const ERRORES = [
  { fila: 2, columna: "sku", valor: "", motivo: "El SKU es obligatorio." },
  { fila: 5, columna: "stock", valor: "-3", motivo: "El stock no puede ser negativo." },
];

describe("TablaErroresImportacion", () => {
  it("no renderiza nada sin errores", () => {
    const { container } = render(<TablaErroresImportacion errores={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("muestra una fila por cada error de importación", () => {
    render(<TablaErroresImportacion errores={ERRORES} />);

    expect(screen.getByText("El SKU es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El stock no puede ser negativo.")).toBeInTheDocument();
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", () => {
    render(<TablaErroresImportacion errores={ERRORES} />);

    esperarTablaApilada(screen.getByRole("table"));
  });
});
