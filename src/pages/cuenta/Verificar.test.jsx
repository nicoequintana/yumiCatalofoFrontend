import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Verificar from "./Verificar.jsx";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

function renderConToken(token) {
  const ruta = token ? `/cuenta/verificar?token=${token}` : "/cuenta/verificar";
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Verificar />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Verificar — sin token", () => {
  it("no dispara ningún POST y avisa que falta el link", () => {
    renderConToken(null);
    expect(cuentaApi.verificarCuenta).not.toHaveBeenCalled();
    expect(screen.getByText("Falta el link")).toBeInTheDocument();
  });
});

describe("Verificar — con token", () => {
  it("el POST NUNCA se dispara al montar — solo al tocar el botón", () => {
    renderConToken("tok-1");
    expect(cuentaApi.verificarCuenta).not.toHaveBeenCalled();
  });

  it("éxito: 'Tu cuenta está lista.' y un link a Entrá", async () => {
    const user = userEvent.setup();
    cuentaApi.verificarCuenta.mockResolvedValue({ mensaje: "Tu cuenta está lista. Entrá." });

    renderConToken("tok-1");
    await user.click(screen.getByRole("button", { name: "Confirmar mi cuenta" }));

    expect(await screen.findByText("Tu cuenta está lista.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Entrá" })).toHaveAttribute("href", "/cuenta/entrar");
    expect(cuentaApi.verificarCuenta).toHaveBeenCalledWith("tok-1");
  });

  it("USADO: 'Este link ya se usó.'", async () => {
    const user = userEvent.setup();
    cuentaApi.verificarCuenta.mockRejectedValue(
      Object.assign(new Error("Token usado"), { motivo: "USADO" }),
    );

    renderConToken("tok-1");
    await user.click(screen.getByRole("button", { name: "Confirmar mi cuenta" }));

    expect(await screen.findByText("Este link ya se usó.")).toBeInTheDocument();
  });

  it("VENCIDO: 'Este link venció.' con Reenviar y la Puerta de WhatsApp", async () => {
    const user = userEvent.setup();
    cuentaApi.verificarCuenta.mockRejectedValue(
      Object.assign(new Error("Token vencido"), { motivo: "VENCIDO" }),
    );

    renderConToken("tok-1");
    await user.click(screen.getByRole("button", { name: "Confirmar mi cuenta" }));

    expect(await screen.findByText("Este link venció.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reenviar" })).toBeInTheDocument();
  });
});
