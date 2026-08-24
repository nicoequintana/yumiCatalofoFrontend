import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DialogoNotificarEstado from "./DialogoNotificarEstado.jsx";

const onConfirmar = vi.fn();
const onCancelar = vi.fn();

const PROPS = {
  ordenId: 42,
  estadoAnterior: "PENDIENTE",
  estadoNuevo: "CONFIRMADA",
  emailCliente: "juan@gmail.com",
  guardando: false,
  onConfirmar,
  onCancelar,
};

beforeEach(() => {
  onConfirmar.mockReset();
  onCancelar.mockReset();
});

describe("DialogoNotificarEstado", () => {
  it("es un diálogo modal accesible", () => {
    render(<DialogoNotificarEstado {...PROPS} />);

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
  });

  it("dice de qué estado a cuál pasa la orden", () => {
    render(<DialogoNotificarEstado {...PROPS} />);

    expect(screen.getByText(/Pendiente/)).toBeInTheDocument();
    expect(screen.getByText(/Confirmada/)).toBeInTheDocument();
    expect(screen.getByText(/#42/)).toBeInTheDocument();
  });

  it("muestra a qué dirección se le escribiría", () => {
    render(<DialogoNotificarEstado {...PROPS} />);

    expect(screen.getByText("juan@gmail.com")).toBeInTheDocument();
  });

  it("confirma con notificación", async () => {
    const usuario = userEvent.setup();
    render(<DialogoNotificarEstado {...PROPS} />);

    await usuario.click(screen.getByRole("button", { name: "Notificar y guardar" }));

    expect(onConfirmar).toHaveBeenCalledWith(true);
  });

  it("confirma sin notificación", async () => {
    const usuario = userEvent.setup();
    render(<DialogoNotificarEstado {...PROPS} />);

    await usuario.click(screen.getByRole("button", { name: "Guardar sin notificar" }));

    expect(onConfirmar).toHaveBeenCalledWith(false);
  });

  it("cancela sin confirmar nada", async () => {
    const usuario = userEvent.setup();
    render(<DialogoNotificarEstado {...PROPS} />);

    await usuario.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancelar).toHaveBeenCalledTimes(1);
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it("cierra con Escape", async () => {
    const usuario = userEvent.setup();
    render(<DialogoNotificarEstado {...PROPS} />);

    await usuario.keyboard("{Escape}");

    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it("deshabilita notificar cuando el cliente no tiene email, y explica por qué", () => {
    render(<DialogoNotificarEstado {...PROPS} emailCliente={null} />);

    expect(screen.getByRole("button", { name: "Notificar y guardar" })).toBeDisabled();
    expect(screen.getByText(/no tiene email registrado/i)).toBeInTheDocument();
  });

  it("deja guardar sin notificar aunque no haya email", () => {
    render(<DialogoNotificarEstado {...PROPS} emailCliente={null} />);

    expect(screen.getByRole("button", { name: "Guardar sin notificar" })).toBeEnabled();
  });

  it("deshabilita todas las acciones mientras guarda", () => {
    render(<DialogoNotificarEstado {...PROPS} guardando />);

    expect(screen.getByRole("button", { name: /guardando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Guardar sin notificar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
  });
});
