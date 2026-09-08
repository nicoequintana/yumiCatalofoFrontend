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

  // Medido en navegador el 07/09/2026, a 390px sobre `/producto/21`: los dos
  // botones daban 40x41 de área efectiva (sondeada con `elementFromPoint`,
  // no la caja declarada), contra el mínimo táctil de 44x44. La variante
  // `compacto` de la barra fija estaba peor: 36x36.
  //
  // jsdom no hace layout, así que acá se afirma sobre la CLASE. La medición
  // real es en navegador — el test protege que nadie devuelva el tamaño a un
  // valor por debajo del mínimo sin darse cuenta.
  it.each([
    ["normal", false],
    ["compacto", true],
  ])("los botones declaran el mínimo táctil de 44px en la variante %s", (_, compacto) => {
    render(<SelectorCantidad value={2} onChange={vi.fn()} compacto={compacto} />);

    for (const nombre of [/aumentar/i, /disminuir/i]) {
      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" ")).toContain("min-h-11");
      expect(boton.className.split(" ")).toContain("min-w-11");
    }
  });
});
