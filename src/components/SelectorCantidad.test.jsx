import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SelectorCantidad from "./SelectorCantidad.jsx";

describe("SelectorCantidad", () => {
  it("muestra el valor actual", () => {
    render(<SelectorCantidad value={3} onChange={vi.fn()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("botón + llama a onChange con el valor incrementado", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={3} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /aumentar/i }));

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("botón − llama a onChange con el valor decrementado", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={3} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /disminuir/i }));

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("botón − en el mínimo (1 por defecto) no llama a onChange", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={1} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /disminuir/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("botón − respeta un mínimo custom", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={5} onChange={onChange} min={5} />);

    fireEvent.click(screen.getByRole("button", { name: /disminuir/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("botón + en el máximo no llama a onChange y queda deshabilitado", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={2} onChange={onChange} max={2} />);

    const aumentar = screen.getByRole("button", { name: /aumentar/i });
    expect(aumentar).toBeDisabled();

    fireEvent.click(aumentar);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("botón + por debajo del máximo sigue incrementando", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={1} onChange={onChange} max={3} />);

    fireEvent.click(screen.getByRole("button", { name: /aumentar/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("sin max no inventa ningún tope", () => {
    const onChange = vi.fn();
    render(<SelectorCantidad value={999} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /aumentar/i }));
    expect(onChange).toHaveBeenCalledWith(1000);
  });

  it("en el máximo, el botón + dice POR QUÉ está deshabilitado", () => {
    // Un botón deshabilitado sin motivo se lee como una app rota. El CTA de al
    // lado ya cambia a "Máximo en carrito"; el nombre accesible del propio
    // botón tiene que decir lo mismo para quien navega con lector de pantalla.
    render(<SelectorCantidad value={2} onChange={vi.fn()} max={2} />);

    const aumentar = screen.getByRole("button", { name: /aumentar/i });
    expect(aumentar).toBeDisabled();
    expect(aumentar).toHaveAccessibleName(/máximo disponible/i);
    expect(aumentar).toHaveAccessibleName(/2/);
  });

  it("por debajo del máximo el botón + no inventa ningún motivo", () => {
    render(<SelectorCantidad value={1} onChange={vi.fn()} max={3} />);

    expect(screen.getByRole("button", { name: /aumentar/i })).not.toHaveAccessibleName(
      /máximo disponible/i,
    );
  });

  it("expone botones accesibles con aria-label", () => {
    render(<SelectorCantidad value={2} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /aumentar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disminuir/i })).toBeInTheDocument();
  });

  // Forma única (13/09/2026): tenía una variante normal (`h-10`, `min-h-11`,
  // `rounded-lg`) y la compacta de la ficha. Al pasar la ficha entera a la
  // compacta, el carrito también la tomó y la normal se borró.
  //
  // Se DIBUJA en 36x36 y llega a 44x44 por pseudo-elemento (`AREA_TACTIL_ICONO`).
  // Los dos botones quedan a 36 + el valor de paso (más de 44): las áreas no se
  // pisan. Medido en navegador el 13/09/2026: 44x44 efectivos en cada botón.
  it("los botones se dibujan en 36px y extienden el área táctil a 44 por pseudo-elemento", () => {
    render(<SelectorCantidad value={2} onChange={vi.fn()} />);

    for (const nombre of [/aumentar/i, /disminuir/i]) {
      const clases = screen.getByRole("button", { name: nombre }).className.split(" ");
      expect(clases).toContain("h-9");
      expect(clases).toContain("w-9");
      expect(clases).not.toContain("min-h-11");
      expect(clases).toContain("before:h-11");
      expect(clases).toContain("before:w-11");
      expect(clases).toContain("before:content-['']");
    }
  });

  // `overflow-hidden` recortaría el pseudo-elemento y el área táctil volvería
  // a 36. Las esquinas las redondea cada botón.
  it("el contenedor no recorta y va redondeado como el botón de agregar", () => {
    render(<SelectorCantidad value={2} onChange={vi.fn()} />);

    const contenedor = screen.getByRole("button", { name: /aumentar/i }).parentElement;
    expect(contenedor).not.toHaveClass("overflow-hidden");
    expect(contenedor).toHaveClass("rounded-full");
    expect(screen.getByRole("button", { name: /disminuir/i })).toHaveClass("rounded-l-full");
    expect(screen.getByRole("button", { name: /aumentar/i })).toHaveClass("rounded-r-full");
  });

  it("el valor usa el ancho y el texto chicos", () => {
    render(<SelectorCantidad value={1} onChange={vi.fn()} />);

    expect(screen.getByText("1")).toHaveClass("min-w-8", "text-body-sm");
  });
  // Varios steppers en la misma pantalla (filas del editor de combos): sin el
  // producto en el nombre, un lector de pantalla oye N veces "Aumentar cantidad".
  it("con `etiqueta` nombra de qué es la cantidad; sin ella el nombre no cambia", () => {
    const { unmount } = render(<SelectorCantidad value={2} onChange={vi.fn()} etiqueta="Lámpara" />);

    expect(screen.getByRole("button", { name: "Aumentar cantidad de Lámpara" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disminuir cantidad de Lámpara" })).toBeInTheDocument();
    unmount();

    render(<SelectorCantidad value={2} onChange={vi.fn()} max={2} etiqueta="Lámpara" />);
    expect(screen.getByRole("button", { name: /aumentar/i })).toHaveAccessibleName(
      "Aumentar cantidad de Lámpara — ya alcanzaste el máximo disponible (2)",
    );
  });
  // El talón de `PaginaCombo` es teal oscuro: con los colores de siempre
  // (`text-on-surface-variant`, `border-outline-variant`) el stepper quedaba
  // oscuro sobre oscuro. `sobreOscuro` cambia SOLO los colores, no la forma.
  it("con `sobreOscuro` usa aro, íconos y número claros; sin él, los de siempre", () => {
    const { unmount } = render(<SelectorCantidad value={2} onChange={vi.fn()} sobreOscuro />);

    const contenedor = screen.getByRole("button", { name: /aumentar/i }).parentElement;
    expect(contenedor).toHaveClass("border-on-primary/40", "rounded-full");
    expect(contenedor).not.toHaveClass("border-outline-variant");
    expect(screen.getByRole("button", { name: /aumentar/i })).toHaveClass("text-on-primary");
    expect(screen.getByRole("button", { name: /disminuir/i })).not.toHaveClass("text-on-surface-variant");
    expect(screen.getByText("2")).toHaveClass("text-on-primary", "border-on-primary/40");
    unmount();

    render(<SelectorCantidad value={2} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /aumentar/i }).parentElement).toHaveClass("border-outline-variant");
    expect(screen.getByRole("button", { name: /aumentar/i })).toHaveClass("text-on-surface-variant");
    expect(screen.getByText("2")).toHaveClass("text-on-surface");
  });
});
