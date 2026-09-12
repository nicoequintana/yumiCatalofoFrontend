import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Registro from "./Registro.jsx";
import useCarrito from "../../hooks/useCarrito.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

function renderRegistro() {
  return render(
    <MemoryRouter>
      <Registro />
    </MemoryRouter>,
  );
}

async function completarFormulario(user) {
  await user.type(screen.getByLabelText("Email"), "cliente@gmail.com");
  await user.type(screen.getByLabelText("Contraseña"), "secreta12");
  await user.type(screen.getByLabelText("Nombre"), "Cliente Prueba");
  await user.type(screen.getByLabelText("Teléfono"), "1122334455");
  await user.type(screen.getByLabelText("DNI"), "12345678");
}

beforeEach(() => {
  vi.clearAllMocks();
  const { result } = renderHook(() => useCarrito());
  act(() => {
    result.current.vaciar();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Registro — campos", () => {
  it("tiene los cinco labels y el botón Registrarme", () => {
    renderRegistro();
    for (const etiqueta of ["Email", "Contraseña", "Nombre", "Teléfono", "DNI"]) {
      expect(screen.getByLabelText(etiqueta)).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Registrarme" })).toBeInTheDocument();
  });
});

describe("Registro — éxito", () => {
  it("manda los cinco campos y muestra Revisá tu casilla", async () => {
    const user = userEvent.setup();
    cuentaApi.registrarCuenta.mockResolvedValue({ mensaje: "Te mandamos un mail." });

    renderRegistro();
    await completarFormulario(user);
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(await screen.findByText("Revisá tu casilla")).toBeInTheDocument();
    expect(cuentaApi.registrarCuenta).toHaveBeenCalledWith({
      email: "cliente@gmail.com",
      password: "secreta12",
      nombre: "Cliente Prueba",
      telefono: "1122334455",
      dni: "12345678",
    });
  });

  it("desde Revisá tu casilla, Reenviar pide un mail nuevo y muestra la Puerta de WhatsApp", async () => {
    const user = userEvent.setup();
    cuentaApi.registrarCuenta.mockResolvedValue({ mensaje: "Te mandamos un mail." });
    cuentaApi.reenviarVerificacion.mockResolvedValue({ mensaje: "Te reenviamos el mail." });

    renderRegistro();
    await completarFormulario(user);
    await user.click(screen.getByRole("button", { name: "Registrarme" }));
    await screen.findByText("Revisá tu casilla");

    await user.click(screen.getByRole("button", { name: "Reenviar" }));

    expect(await screen.findByText("Te reenviamos el mail.")).toBeInTheDocument();
    expect(cuentaApi.reenviarVerificacion).toHaveBeenCalledWith("cliente@gmail.com");
  });
});

describe("Registro — error", () => {
  it("muestra el error del backend y no cambia de pantalla", async () => {
    const user = userEvent.setup();
    cuentaApi.registrarCuenta.mockRejectedValue(new Error("Ocupado, probá de nuevo."));

    renderRegistro();
    await completarFormulario(user);
    await user.click(screen.getByRole("button", { name: "Registrarme" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ocupado, probá de nuevo.");
    expect(screen.queryByText("Revisá tu casilla")).not.toBeInTheDocument();
  });
});
