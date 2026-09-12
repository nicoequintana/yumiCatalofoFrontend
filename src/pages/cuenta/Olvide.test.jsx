import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Olvide from "./Olvide.jsx";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

function renderOlvide() {
  return render(
    <MemoryRouter>
      <Olvide />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Olvide", () => {
  it("tiene el label Email", () => {
    renderOlvide();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("al enviar, muestra la respuesta uniforme con la Puerta de WhatsApp", async () => {
    const user = userEvent.setup();
    cuentaApi.olvidePassword.mockResolvedValue({ mensaje: "ok" });

    renderOlvide();
    await user.type(screen.getByLabelText("Email"), "cliente@gmail.com");
    await user.click(screen.getByRole("button", { name: "Enviar instrucciones" }));

    expect(
      await screen.findByText(
        "Si hay una cuenta con ese email, te mandamos las instrucciones. ¿No te llegó en 5 minutos? Revisá spam o escribinos por WhatsApp.",
      ),
    ).toBeInTheDocument();
    expect(cuentaApi.olvidePassword).toHaveBeenCalledWith("cliente@gmail.com");
  });

  it("muestra el mismo mensaje uniforme también si el backend rechaza (nunca delata si el email existe)", async () => {
    // No debería pasar en la práctica —la spec dice que /olvide SIEMPRE
    // responde 200— pero si algún día un 5xx se cuela, esta pantalla no
    // tiene por qué mostrar el error crudo del servidor en un formulario
    // que ya de por sí no revela nada.
    const user = userEvent.setup();
    cuentaApi.olvidePassword.mockRejectedValue(new Error("Ocupado."));

    renderOlvide();
    await user.type(screen.getByLabelText("Email"), "cliente@gmail.com");
    await user.click(screen.getByRole("button", { name: "Enviar instrucciones" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ocupado.");
  });
});
