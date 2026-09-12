import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ConfirmarEmail from "./ConfirmarEmail.jsx";
import * as cuentaApi from "../../api/cuenta.js";
import * as perfilCliente from "../../hooks/usePerfilCliente.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({ invalidarPerfil: vi.fn() }));

function renderConToken(token) {
  const ruta = token ? `/cuenta/email/confirmar?token=${token}` : "/cuenta/email/confirmar";
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <ConfirmarEmail />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ConfirmarEmail", () => {
  it("sin token, avisa que falta el link", () => {
    renderConToken(null);
    expect(screen.getByText("Falta el link")).toBeInTheDocument();
  });

  it("el POST solo se dispara al tocar el boton", () => {
    // Mismo motivo que en Verificar.jsx: un useEffect que confirma al montar
    // es lo que Outlook Safe Links y los antivirus prefetchean, y consumen el
    // token antes de que la persona llegue a abrir el mail.
    renderConToken("tok-1");
    expect(cuentaApi.confirmarEmail).not.toHaveBeenCalled();
  });

  it("exito: invalida el perfil y muestra 'Tu email se actualizo.'", async () => {
    const user = userEvent.setup();
    cuentaApi.confirmarEmail.mockResolvedValue({});

    renderConToken("tok-1");
    await user.click(screen.getByRole("button", { name: "Confirmar email" }));

    expect(await screen.findByText("Tu email se actualizó.")).toBeInTheDocument();
    expect(perfilCliente.invalidarPerfil).toHaveBeenCalledTimes(1);
  });

  it("409 (colision) muestra que el email ya esta en uso", async () => {
    const user = userEvent.setup();
    cuentaApi.confirmarEmail.mockRejectedValue(
      Object.assign(new Error("conflicto"), { status: 409 }),
    );

    renderConToken("tok-1");
    await user.click(screen.getByRole("button", { name: "Confirmar email" }));

    expect(
      await screen.findByText("Ese email ya está en uso por otra cuenta."),
    ).toBeInTheDocument();
  });

  it("VENCIDO muestra 'Este link vencio.'", async () => {
    const user = userEvent.setup();
    cuentaApi.confirmarEmail.mockRejectedValue(
      Object.assign(new Error("vencido"), { motivo: "VENCIDO" }),
    );

    renderConToken("tok-1");
    await user.click(screen.getByRole("button", { name: "Confirmar email" }));

    expect(await screen.findByText("Este link venció.")).toBeInTheDocument();
  });
});
