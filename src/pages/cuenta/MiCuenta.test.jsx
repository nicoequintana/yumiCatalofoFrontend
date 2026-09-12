import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MiCuenta from "./MiCuenta.jsx";
import usePerfilCliente, * as perfilCliente from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({
  default: vi.fn(),
  invalidarPerfil: vi.fn(),
  refrescarPerfil: vi.fn(),
}));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderMiCuenta(perfil) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter>
      <MiCuenta />
    </MemoryRouter>,
  );
}

const PERFIL_LOCAL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  telefono: "1122334455",
  dni: "12345678",
  tieneGoogle: false,
  tienePassword: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MiCuenta — datos", () => {
  it("muestra el email y el nombre del perfil", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByText("cliente@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Cliente Prueba")).toBeInTheDocument();
  });

  it("con tienePassword:false (cuenta pura de Google) no muestra el form de cambiar contraseña", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, tienePassword: false });
    expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();
  });
});

describe("MiCuenta — cambiar contraseña", () => {
  it("manda actual y nueva, y muestra la confirmación", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarPassword.mockResolvedValue({ ok: true });

    renderMiCuenta(PERFIL_LOCAL);
    await user.type(screen.getByLabelText("Contraseña actual"), "vieja123");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva456");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(screen.getByText("Contraseña actualizada.")).toBeInTheDocument());
    expect(cuentaApi.cambiarPassword).toHaveBeenCalledWith({ actual: "vieja123", nueva: "nueva456" });
  });

  it("una respuesta 409 (cambió por otro lado) muestra el mensaje del backend, sin romper la pantalla", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarPassword.mockRejectedValue(
      Object.assign(new Error("La contraseña cambió mientras tanto. Volvé a intentar."), {
        status: 409,
      }),
    );

    renderMiCuenta(PERFIL_LOCAL);
    await user.type(screen.getByLabelText("Contraseña actual"), "vieja123");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva456");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(
      await screen.findByText("La contraseña cambió mientras tanto. Volvé a intentar."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Contraseña actualizada.")).not.toBeInTheDocument();
  });
});

describe("MiCuenta — cerrar sesión", () => {
  it('pide confirmación con "Vas a cerrar sesión en todos tus dispositivos." antes de salir', async () => {
    const user = userEvent.setup();

    renderMiCuenta(PERFIL_LOCAL);
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(
      screen.getByText("Vas a cerrar sesión en todos tus dispositivos."),
    ).toBeInTheDocument();
    expect(cuentaApi.salirCuenta).not.toHaveBeenCalled();
  });

  it("al confirmar, llama a salirCuenta, invalida el perfil y navega a /", async () => {
    const user = userEvent.setup();
    cuentaApi.salirCuenta.mockResolvedValue(undefined);

    renderMiCuenta(PERFIL_LOCAL);
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cierre de sesión" }));

    await waitFor(() => expect(cuentaApi.salirCuenta).toHaveBeenCalledTimes(1));
    expect(perfilCliente.invalidarPerfil).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});
