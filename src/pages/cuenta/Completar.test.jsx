import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Completar from "./Completar.jsx";
import usePerfilCliente, * as perfilCliente from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({
  default: vi.fn(),
  refrescarPerfil: vi.fn(),
}));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderCompletar(ruta, perfil) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Completar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Completar — solo pide lo que falta", () => {
  it("con nombre y teléfono ya cargados, solo muestra el campo DNI", () => {
    renderCompletar("/cuenta/completar", {
      id: 1,
      nombre: "Ana",
      telefono: "111",
      dni: null,
    });

    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Teléfono")).not.toBeInTheDocument();
    expect(screen.getByLabelText("DNI")).toBeInTheDocument();
  });

  it("sin ningún dato, muestra los tres campos", () => {
    renderCompletar("/cuenta/completar", { id: 1, nombre: null, telefono: null, dni: null });

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByLabelText("Teléfono")).toBeInTheDocument();
    expect(screen.getByLabelText("DNI")).toBeInTheDocument();
  });
});

describe("Completar — submit", () => {
  it("guarda solo los campos faltantes, refresca el perfil YA y navega a volverA", async () => {
    const user = userEvent.setup();
    cuentaApi.actualizarPerfil.mockResolvedValue({});

    renderCompletar(
      `/cuenta/completar?volverA=${encodeURIComponent("/checkout")}`,
      { id: 1, nombre: "Ana", telefono: "111", dni: null },
    );

    await user.type(screen.getByLabelText("DNI"), "12345678");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    await waitFor(() =>
      expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({
        nombre: undefined,
        telefono: undefined,
        dni: "12345678",
      }),
    );
    // `refrescarPerfil`, NUNCA `invalidarPerfil`: esta pantalla navega a un
    // destino que sigue DENTRO de `RequireAuthCliente` (`/checkout`, o `/cuenta`
    // por defecto). `invalidarPerfil` solo limpia y espera un montaje futuro del
    // guard, que ya está montado — quedaría el spinner girando para siempre.
    expect(perfilCliente.refrescarPerfil).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/checkout");
  });

  it("muestra el error del backend sin navegar", async () => {
    const user = userEvent.setup();
    cuentaApi.actualizarPerfil.mockRejectedValue(new Error("DNI inválido."));

    renderCompletar("/cuenta/completar", { id: 1, nombre: "Ana", telefono: "111", dni: null });

    await user.type(screen.getByLabelText("DNI"), "abc");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("DNI inválido.");
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
