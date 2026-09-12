import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Seguridad from "./Seguridad.jsx";
import usePerfilCliente from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({
  default: vi.fn(),
  invalidarPerfil: vi.fn(),
  refrescarPerfil: vi.fn(),
}));

function renderSeguridad(perfil) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter>
      <Seguridad />
    </MemoryRouter>,
  );
}

const PERFIL_LOCAL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  telefono: "1122334455",
  dni: "12345678",
  apodo: null,
  tieneGoogle: false,
  tienePassword: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Seguridad — cambiar contraseña", () => {
  it("con tienePassword:false (cuenta pura de Google) no muestra el form de cambiar contraseña", () => {
    renderSeguridad({ ...PERFIL_LOCAL, tienePassword: false, tieneGoogle: true });
    expect(screen.queryByLabelText("Contraseña actual")).not.toBeInTheDocument();
    expect(screen.getByText("Entrás a tu cuenta con Google.")).toBeInTheDocument();
  });

  it("manda actual y nueva, y muestra la confirmación", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarPassword.mockResolvedValue({ ok: true });

    renderSeguridad(PERFIL_LOCAL);
    await user.type(screen.getByLabelText("Contraseña actual"), "vieja123");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva456");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(screen.getByText("Contraseña actualizada.")).toBeInTheDocument());
    expect(cuentaApi.cambiarPassword).toHaveBeenCalledWith({
      actual: "vieja123",
      nueva: "nueva456",
    });
  });

  it("una respuesta 409 (cambió por otro lado) muestra el mensaje del backend, sin romper la pantalla", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarPassword.mockRejectedValue(
      Object.assign(new Error("La contraseña cambió mientras tanto. Volvé a intentar."), {
        status: 409,
      }),
    );

    renderSeguridad(PERFIL_LOCAL);
    await user.type(screen.getByLabelText("Contraseña actual"), "vieja123");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva456");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(
      await screen.findByText("La contraseña cambió mientras tanto. Volvé a intentar."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Contraseña actualizada.")).not.toBeInTheDocument();
  });
});
