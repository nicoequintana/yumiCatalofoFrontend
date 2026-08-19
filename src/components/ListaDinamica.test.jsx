import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ListaDinamica from "./ListaDinamica.jsx";

function itemsDePrueba() {
  return [
    { id: "a", texto: "Primero" },
    { id: "b", texto: "Segundo" },
    { id: "c", texto: "Tercero" },
  ];
}

describe("ListaDinamica", () => {
  it("renderiza cada item con su texto", () => {
    render(<ListaDinamica items={itemsDePrueba()} onChange={vi.fn()} placeholder="Ej: algo" />);
    expect(screen.getByText("Primero")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
    expect(screen.getByText("Tercero")).toBeInTheDocument();
  });

  it("agrega un item nuevo al escribir y clickear Agregar", () => {
    const onChange = vi.fn();
    render(<ListaDinamica items={[]} onChange={onChange} placeholder="Ej: algo" />);

    fireEvent.change(screen.getByPlaceholderText("Ej: algo"), { target: { value: "Nuevo item" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ texto: "Nuevo item" })]);
  });

  it("no agrega un item con texto vacío", () => {
    const onChange = vi.fn();
    render(<ListaDinamica items={[]} onChange={onChange} placeholder="Ej: algo" />);

    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("elimina un item al clickear su botón eliminar", () => {
    const onChange = vi.fn();
    render(<ListaDinamica items={itemsDePrueba()} onChange={onChange} placeholder="Ej: algo" />);

    fireEvent.click(screen.getByLabelText("Eliminar Segundo"));

    expect(onChange).toHaveBeenCalledWith([
      { id: "a", texto: "Primero" },
      { id: "c", texto: "Tercero" },
    ]);
  });

  it("mueve un item hacia arriba al clickear su botón subir", () => {
    const onChange = vi.fn();
    render(<ListaDinamica items={itemsDePrueba()} onChange={onChange} placeholder="Ej: algo" />);

    fireEvent.click(screen.getByLabelText("Mover Segundo hacia arriba"));

    expect(onChange).toHaveBeenCalledWith([
      { id: "b", texto: "Segundo" },
      { id: "a", texto: "Primero" },
      { id: "c", texto: "Tercero" },
    ]);
  });

  it("mueve un item hacia abajo al clickear su botón bajar", () => {
    const onChange = vi.fn();
    render(<ListaDinamica items={itemsDePrueba()} onChange={onChange} placeholder="Ej: algo" />);

    fireEvent.click(screen.getByLabelText("Mover Segundo hacia abajo"));

    expect(onChange).toHaveBeenCalledWith([
      { id: "a", texto: "Primero" },
      { id: "c", texto: "Tercero" },
      { id: "b", texto: "Segundo" },
    ]);
  });

  it("no muestra el botón subir en el primer item ni el botón bajar en el último", () => {
    render(<ListaDinamica items={itemsDePrueba()} onChange={vi.fn()} placeholder="Ej: algo" />);

    expect(screen.queryByLabelText("Mover Primero hacia arriba")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mover Tercero hacia abajo")).not.toBeInTheDocument();
  });
});
