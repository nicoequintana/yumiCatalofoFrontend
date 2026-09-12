import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CambiarEmail from "./CambiarEmail.jsx";
import usePerfilCliente from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({ default: vi.fn() }));

function renderCambiarEmail(perfil = { id: 1, tieneGoogle: false }) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter>
      <CambiarEmail />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CambiarEmail — sin Google vinculado", () => {
  it("no muestra el aviso de desvinculación", () => {
    renderCambiarEmail({ id: 1, tieneGoogle: false });
    expect(
      screen.queryByText("Al cambiar el email se desvincula tu cuenta de Google"),
    ).not.toBeInTheDocument();
  });
});

describe("CambiarEmail — con Google vinculado", () => {
  it("muestra el aviso de desvinculación", () => {
    renderCambiarEmail({ id: 1, tieneGoogle: true });
    expect(
      screen.getByText("Al cambiar el email se desvincula tu cuenta de Google"),
    ).toBeInTheDocument();
  });
});

describe("CambiarEmail — submit", () => {
  it("manda emailNuevo y password, y muestra la confirmación", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarEmail.mockResolvedValue({ mensaje: "ok" });

    renderCambiarEmail();
    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@gmail.com");
    await user.type(screen.getByLabelText("Contraseña actual"), "secreta12");
    await user.click(screen.getByRole("button", { name: "Cambiar email" }));

    expect(await screen.findByText("Confirmá el cambio")).toBeInTheDocument();
    expect(cuentaApi.cambiarEmail).toHaveBeenCalledWith({
      emailNuevo: "nuevo@gmail.com",
      password: "secreta12",
    });
  });

  it("muestra el error del backend sin avanzar", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarEmail.mockRejectedValue(new Error("Contraseña incorrecta."));

    renderCambiarEmail();
    await user.type(screen.getByLabelText("Email nuevo"), "nuevo@gmail.com");
    await user.type(screen.getByLabelText("Contraseña actual"), "mala");
    await user.click(screen.getByRole("button", { name: "Cambiar email" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Contraseña incorrecta.");
    expect(screen.queryByText("Confirmá el cambio")).not.toBeInTheDocument();
  });
});
