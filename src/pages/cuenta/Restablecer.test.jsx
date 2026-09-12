import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Restablecer from "./Restablecer.jsx";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

function renderConToken(token) {
  const ruta = token ? `/cuenta/restablecer?token=${token}` : "/cuenta/restablecer";
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Restablecer />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Restablecer — sin token", () => {
  it("avisa que falta el link, sin formulario", () => {
    renderConToken(null);
    expect(screen.getByText("Falta el link")).toBeInTheDocument();
    expect(screen.queryByLabelText("Contraseña")).not.toBeInTheDocument();
  });
});

describe("Restablecer — con token", () => {
  it("envía token + password nueva y muestra éxito", async () => {
    const user = userEvent.setup();
    cuentaApi.restablecerPassword.mockResolvedValue({ ok: true });

    renderConToken("tok-1");
    await user.type(screen.getByLabelText("Contraseña"), "nuevaClave12");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("Contraseña actualizada")).toBeInTheDocument();
    expect(cuentaApi.restablecerPassword).toHaveBeenCalledWith({
      token: "tok-1",
      password: "nuevaClave12",
    });
  });

  it("VENCIDO muestra 'Este link venció.'", async () => {
    const user = userEvent.setup();
    cuentaApi.restablecerPassword.mockRejectedValue(
      Object.assign(new Error("vencido"), { motivo: "VENCIDO" }),
    );

    renderConToken("tok-1");
    await user.type(screen.getByLabelText("Contraseña"), "nuevaClave12");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("Este link venció.")).toBeInTheDocument();
  });

  it("USADO muestra 'Este link ya se usó.'", async () => {
    const user = userEvent.setup();
    cuentaApi.restablecerPassword.mockRejectedValue(
      Object.assign(new Error("usado"), { motivo: "USADO" }),
    );

    renderConToken("tok-1");
    await user.type(screen.getByLabelText("Contraseña"), "nuevaClave12");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("Este link ya se usó.")).toBeInTheDocument();
  });
});
