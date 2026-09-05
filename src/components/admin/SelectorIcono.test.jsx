import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SelectorIcono from "./SelectorIcono.jsx";

describe("SelectorIcono", () => {
  it("marca el ícono elegido", () => {
    render(<SelectorIcono valor="chair" onCambiar={() => {}} />);

    expect(screen.getByRole("radio", { name: /chair/i })).toBeChecked();
  });

  it("avisa el ícono elegido", async () => {
    const usuario = userEvent.setup();
    const onCambiar = vi.fn();
    render(<SelectorIcono valor={null} onCambiar={onCambiar} />);

    await usuario.click(screen.getByRole("radio", { name: /pets/i }));

    expect(onCambiar).toHaveBeenCalledWith("pets");
  });

  it("se puede volver a sin ícono", async () => {
    const usuario = userEvent.setup();
    const onCambiar = vi.fn();
    render(<SelectorIcono valor="chair" onCambiar={onCambiar} />);

    await usuario.click(screen.getByRole("radio", { name: /sin ícono/i }));

    expect(onCambiar).toHaveBeenCalledWith(null);
  });
});
