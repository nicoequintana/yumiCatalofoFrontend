import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CombosDeCampania from "./CombosDeCampania.jsx";

const COMBOS = [
  { id: 4, nombre: "Kit Living", vigencia: "CAMPANIA" },
  { id: 5, nombre: "Kit Dormitorio", vigencia: "SIEMPRE" },
];

describe("CombosDeCampania", () => {
  it("marca los asociados y al tildar uno manda la lista completa", async () => {
    const onGuardar = vi.fn();
    render(<CombosDeCampania combos={COMBOS} asociados={[{ id: 4, nombre: "Kit Living" }]} guardando={false} onGuardar={onGuardar} />);

    expect(screen.getByRole("checkbox", { name: /Kit Living/ })).toBeChecked();
    await userEvent.click(screen.getByRole("checkbox", { name: /Kit Dormitorio/ }));

    expect(onGuardar).toHaveBeenCalledWith([4, 5]);
  });

  it("destildar saca el combo de la lista", async () => {
    const onGuardar = vi.fn();
    render(<CombosDeCampania combos={COMBOS} asociados={[{ id: 4, nombre: "Kit Living" }]} guardando={false} onGuardar={onGuardar} />);

    await userEvent.click(screen.getByRole("checkbox", { name: /Kit Living/ }));

    expect(onGuardar).toHaveBeenCalledWith([]);
  });

  it("avisa cuando un combo asociable no es de vigencia por campaña (la campaña no lo afecta)", () => {
    render(<CombosDeCampania combos={COMBOS} asociados={[]} guardando={false} onGuardar={vi.fn()} />);

    expect(screen.getByText("Siempre vigente: la campaña no cambia cuándo se ve")).toBeInTheDocument();
  });

  it("sin combos en el panel explica dónde crearlos", () => {
    render(<CombosDeCampania combos={[]} asociados={[]} guardando={false} onGuardar={vi.fn()} />);

    expect(screen.getByText(/Todavía no hay combos/)).toBeInTheDocument();
  });
});
