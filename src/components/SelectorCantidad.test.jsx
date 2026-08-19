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

  it("expone botones accesibles con aria-label", () => {
    render(<SelectorCantidad value={2} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /aumentar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /disminuir/i })).toBeInTheDocument();
  });
});
