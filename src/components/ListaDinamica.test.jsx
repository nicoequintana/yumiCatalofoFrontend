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

  it("el campo de alta tiene nombre propio: el placeholder desaparece al tipear", () => {
    // El motor de accesibilidad cae al placeholder cuando no hay nada mejor,
    // pero ese nombre se va en cuanto el campo tiene texto — y en el editor
    // hay CUATRO listas iguales, así que sin nombre propio no se distingue en
    // cuál se está escribiendo.
    render(
      <ListaDinamica
        items={[]}
        onChange={vi.fn()}
        placeholder="Ej: algo"
        etiqueta="Nuevo beneficio"
      />,
    );

    expect(screen.getByLabelText("Nuevo beneficio")).toBeInTheDocument();
  });

  it("no muestra el botón subir en el primer item ni el botón bajar en el último", () => {
    render(<ListaDinamica items={itemsDePrueba()} onChange={vi.fn()} placeholder="Ej: algo" />);

    expect(screen.queryByLabelText("Mover Primero hacia arriba")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mover Tercero hacia abajo")).not.toBeInTheDocument();
  });

  it("el botón Agregar llega a 44 de alto en todos los anchos", () => {
    // Medido en navegador el 07/09/2026 a 390px con `elementFromPoint` (área
    // EFECTIVA, no la caja declarada): 93x43 sobre una caja de 358x43 — el
    // `py-3` con `text-label-md` (14px x 1.2 de interlineado) da 40,8 de
    // contenido y se queda a un pelo de los 44. El `py-3` se conserva: el
    // mínimo táctil es un PISO, no un reemplazo del tamaño de la variante.
    render(<ListaDinamica items={[]} onChange={vi.fn()} placeholder="Ej: algo" />);

    const boton = screen.getByRole("button", { name: "Agregar" });

    expect(boton.className).toContain("min-h-11");
    expect(boton.className).toContain("py-3");
  });
});

/**
 * Área táctil (WCAG 2.5.8). Los botones de subir / bajar / eliminar de cada
 * ítem traían `max-md:min-h-11 max-md:min-w-11`, o sea 44×44 SOLO por debajo
 * de 768px: en escritorio quedaban en el glifo pelado de 18px.
 *
 * ⚠️ **Por eso no aparecieron en la auditoría del 07/09/2026**: el barrido usó
 * `/catalogo/admin/productos/nuevo`, donde las listas arrancan VACÍAS y estos
 * tres botones no se renderizan nunca. Un control que solo existe con datos
 * cargados no lo ve un barrido sobre un formulario en blanco.
 *
 * Se agrandan de verdad y no con pseudo-elemento porque los tres van en un
 * `flex gap-1`: con glifos de 18px el paso es de 22px, y tres áreas postizas
 * de 44 se pisarían entre sí — el de más abajo en el DOM le robaría el área al
 * anterior. Crecer la caja no tiene costo nuevo: en mobile ya medían 44×44,
 * así que escritorio pasa a igualar lo que el celular ya mostraba.
 */
describe("ListaDinamica — área táctil", () => {
  // Los nombres accesibles reales son "Mover <texto> hacia arriba/abajo" y
  // "Eliminar <texto>": nombran el ÍTEM, no la dirección a secas.
  it.each([/hacia arriba$/, /hacia abajo$/, /^Eliminar/])(
    "el botón %s de cada ítem mide 44×44 en TODOS los anchos",
    (nombre) => {
      render(<ListaDinamica items={itemsDePrueba()} onChange={vi.fn()} placeholder="Ej: algo" />);

      for (const boton of screen.getAllByRole("button", { name: nombre })) {
        const clases = boton.className.split(" ");
        expect(clases).toContain("min-h-11");
        expect(clases).toContain("min-w-11");
        // Sin breakpoint: `max-md:` dejaba el escritorio en 18px.
        expect(boton.className).not.toContain("max-md:min-h-11");
      }
    },
  );
});
