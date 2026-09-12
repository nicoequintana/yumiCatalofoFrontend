import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Datos from "./Datos.jsx";
import usePerfilCliente, * as perfilCliente from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({
  default: vi.fn(),
  invalidarPerfil: vi.fn(),
  refrescarPerfil: vi.fn(),
}));

function renderDatos(perfil) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter>
      <Datos />
    </MemoryRouter>,
  );
}

const PERFIL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  telefono: "1122334455",
  dni: "12345678",
  apodo: "Tito",
  tieneGoogle: false,
  tienePassword: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  cuentaApi.actualizarPerfil.mockResolvedValue(PERFIL);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Datos — edición del perfil", () => {
  it("precarga los valores del perfil", () => {
    renderDatos(PERFIL);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Cliente Prueba");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("1122334455");
    expect(screen.getByLabelText("Apodo")).toHaveValue("Tito");
  });

  it("manda SOLO los campos que cambiaron", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("Teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "1199887766");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    // Ni `nombre` ni `apodo` viajan: no se tocaron. Mandarlos vacíos por
    // arrastre daría un 400 que parece del apodo y no lo es.
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ telefono: "1199887766" });
  });

  it("vaciar el apodo manda la cadena vacía, que es como se BORRA", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("Apodo"));
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ apodo: "" });
  });

  it("sin cambios no llama a la API", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(cuentaApi.actualizarPerfil).not.toHaveBeenCalled();
    expect(screen.getByText("No hay cambios para guardar.")).toBeInTheDocument();
  });

  it("un 400 del backend se muestra sin romper la pantalla", async () => {
    const user = userEvent.setup();
    cuentaApi.actualizarPerfil.mockRejectedValue(
      Object.assign(new Error("El apodo no puede superar los 1000 caracteres."), { status: 400 }),
    );

    renderDatos(PERFIL);
    await user.clear(screen.getByLabelText("Apodo"));
    await user.type(screen.getByLabelText("Apodo"), "x");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(
      await screen.findByText("El apodo no puede superar los 1000 caracteres."),
    ).toBeInTheDocument();
  });

  it("al guardar bien refresca el perfil y confirma", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Otro Nombre");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(screen.getByText("Datos actualizados.")).toBeInTheDocument());
    expect(perfilCliente.refrescarPerfil).toHaveBeenCalledTimes(1);
  });

  it("con apodo null y sin tocar nada, NO manda apodo", () => {
    renderDatos({ ...PERFIL, apodo: null });
    expect(screen.getByLabelText("Apodo")).toHaveValue("");
  });

  it("con apodo null, cambiar OTRO campo no arrastra el apodo vacío", async () => {
    const user = userEvent.setup();
    renderDatos({ ...PERFIL, apodo: null });

    await user.clear(screen.getByLabelText("Teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "1199887766");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    // Sin el `?? ""` en la comparación, `"" !== null` daría true y acá viajaría
    // `apodo: ""`, que el backend interpreta como BORRAR. Silencioso y caro.
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ telefono: "1199887766" });
  });
});
