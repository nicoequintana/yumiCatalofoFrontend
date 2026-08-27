import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PreviaTextoImpreso from "./PreviaTextoImpreso.jsx";

const item = (texto) => ({ texto });

describe("PreviaTextoImpreso", () => {
  it("muestra los beneficios que se van a dibujar", () => {
    render(
      <PreviaTextoImpreso
        producto={{ beneficios: [item("Se ceba solo al succionar")], caracteristicas: [], especificaciones: [] }}
      />,
    );
    expect(screen.getByText("Se ceba solo al succionar")).toBeInTheDocument();
  });

  it("muestra las especificaciones como cota o como etiqueta, separadas", () => {
    render(
      <PreviaTextoImpreso
        producto={{
          beneficios: [],
          caracteristicas: [],
          especificaciones: [
            { nombre: "Altura", valor: "30 cm" },
            { nombre: "Material", valor: "Acero" },
          ],
        }}
      />,
    );
    expect(screen.getByText(/cotas/i)).toBeInTheDocument();
    expect(screen.getByText(/Altura/)).toBeInTheDocument();
    expect(screen.getByText(/Material/)).toBeInTheDocument();
  });

  it("avisa que el texto se imprime tal cual", () => {
    render(<PreviaTextoImpreso producto={{ beneficios: [item("A")], caracteristicas: [], especificaciones: [] }} />);
    expect(screen.getByText(/se imprime tal cual|sin corregir/i)).toBeInTheDocument();
  });

  it("con la ficha vacía avisa que las imágenes van a salir sin texto", () => {
    // Es un estado real: un producto cargado a mano y dejado incompleto.
    render(<PreviaTextoImpreso producto={{ beneficios: [], caracteristicas: [], especificaciones: [] }} />);
    expect(screen.getByRole("status")).toHaveTextContent(/sin texto/i);
  });

  it("no renderiza el grupo de un campo vacío", () => {
    render(
      <PreviaTextoImpreso
        producto={{ beneficios: [item("A")], caracteristicas: [], especificaciones: [] }}
      />,
    );
    expect(screen.queryByText(/cotas/i)).not.toBeInTheDocument();
  });
});
